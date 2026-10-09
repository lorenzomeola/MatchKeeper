-- Cancelaciones (PAYMENTS_SPEC.md §5). Se pega entero en el SQL Editor de Supabase. Idempotente.
-- Requiere db/migrations/0009_*.sql (índice parcial: una reserva ACTIVA por partido), db/booking-payments.sql y db/strikes.sql.
-- Requiere db/migrations/0014_*.sql (un partido puede tener 2 porteros: cancelar uno no cancela el partido si queda el otro).
--
-- Todo lo que es solo base de datos va en una transacción: estado de la reserva, strike, estado del partido y
-- de las candidaturas, y el registro de auditoría. El dinero (reembolso y pago al portero) lo hace después el
-- servidor y es reanudable, porque aquí queda guardado cuánto corresponde a cada parte.

create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_by text,
  p_charge_pct smallint,
  p_keeper_share_pence integer,
  p_strike_kind text,
  p_reopen boolean,
  p_reason text,
  p_actor uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
  v_others integer;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found';
  end if;

  -- Si dos partes cancelan a la vez, gana la primera (decisión 8 de la spec).
  if b.status not in ('confirmed', 'under_review') then
    return false;
  end if;

  -- Mismo orden de bloqueo que confirm_booking_payment: reserva y después partido.
  perform 1 from public.matches where id = b.match_id for update;

  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = p_by::public.cancelled_by,
      cancellation_charge_pct = p_charge_pct,
      keeper_payout_pence = p_keeper_share_pence
  where id = b.id;

  if p_strike_kind is not null then
    insert into public.strikes (goalkeeper_id, booking_id, reason, kind)
    values (b.goalkeeper_id, b.id, p_reason, p_strike_kind);
  end if;

  select count(*) into v_others
  from public.bookings
  where match_id = b.match_id and id <> b.id and status not in ('cancelled', 'pending_payment');

  if p_reopen then
    update public.applications set status = 'withdrawn' where id = b.application_id;
    -- Las demás candidaturas las rechazó el sistema al llenarse el partido: vuelven a estar disponibles.
    update public.applications set status = 'pending'
    where match_id = b.match_id and status = 'rejected' and not public.keeper_is_suspended(goalkeeper_id);
    update public.matches set status = 'open' where id = b.match_id;
  elsif v_others > 0 then
    -- Queda otro portero reservado: el partido sigue con los que hay y no se vuelve a abrir.
    update public.applications set status = 'withdrawn' where id = b.application_id;
    update public.applications set status = 'rejected' where match_id = b.match_id and status = 'pending';
    update public.matches
    set keepers_needed = v_others, status = case when status = 'completed' then status else 'assigned' end
    where id = b.match_id;
  else
    update public.matches set status = 'cancelled' where id = b.match_id;
  end if;

  insert into public.booking_events (booking_id, type, actor_id, data)
  values (
    b.id, 'cancelled', p_actor,
    jsonb_build_object(
      'by', p_by, 'charge_pct', p_charge_pct, 'keeper_share_pence', p_keeper_share_pence,
      'reopen', p_reopen, 'reason', p_reason
    )
  );

  if p_strike_kind is not null then
    insert into public.booking_events (booking_id, type, actor_id, data)
    values (b.id, 'strike_issued', p_actor, jsonb_build_object('kind', p_strike_kind, 'goalkeeper_id', b.goalkeeper_id));

    -- Un portero que queda suspendido pierde sus candidaturas pendientes. Sus reservas ya confirmadas siguen y el admin las ve.
    if public.keeper_is_suspended(b.goalkeeper_id) then
      update public.applications set status = 'withdrawn' where goalkeeper_id = b.goalkeeper_id and status = 'pending';
      insert into public.booking_events (booking_id, type, actor_id, data)
      values (b.id, 'keeper_suspended', p_actor, jsonb_build_object('goalkeeper_id', b.goalkeeper_id));
    end if;
  end if;

  return true;
end;
$$;

revoke execute on function public.cancel_booking(uuid, text, smallint, integer, text, boolean, text, uuid) from public, anon, authenticated;
grant execute on function public.cancel_booking(uuid, text, smallint, integer, text, boolean, text, uuid) to service_role;
