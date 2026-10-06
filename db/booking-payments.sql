-- Cobro al elegir portero (PAYMENTS_SPEC.md §4). Se pega entero en el SQL Editor de Supabase. Idempotente.
-- Requiere haber corrido antes db/policies.sql, db/payments.sql y db/migrations/0008_*.sql.
--
-- Cambia el flujo: elegir portero ya NO confirma nada. Crea una reserva `pending_payment`; la candidatura,
-- el partido y las demás candidaturas solo cambian cuando el pago se confirma (confirm_booking_payment).

-- La versión de un solo argumento creaba una reserva confirmada sin pago: se elimina para que nadie la use.
drop function if exists public.accept_application(uuid);

create or replace function public.accept_application(p_application_id uuid, p_terms_version text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications%rowtype;
  v_match public.matches%rowtype;
  v_booking_id uuid;
begin
  select * into v_application from public.applications where id = p_application_id;
  if not found then
    raise exception 'Application not found';
  end if;

  select * into v_match from public.matches where id = v_application.match_id;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.created_by <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  if v_application.status <> 'pending' then
    raise exception 'Application is not pending';
  end if;

  if v_match.status <> 'open' then
    raise exception 'Match is not open';
  end if;

  if v_match.ends_at <= now() then
    raise exception 'Match is already over';
  end if;

  if not public.keeper_can_get_paid(v_application.goalkeeper_id) then
    raise exception 'Keeper has not set up payments';
  end if;

  if public.keeper_is_suspended(v_application.goalkeeper_id) then
    raise exception 'Keeper is suspended';
  end if;

  -- Un portero no puede estar en dos partidos a la vez. Un pago pendiente reciente también reserva la hora.
  if exists (
    select 1
    from public.bookings b
    join public.matches m on m.id = b.match_id
    where b.goalkeeper_id = v_application.goalkeeper_id
      and b.match_id <> v_match.id
      and (b.status in ('confirmed', 'under_review') or (b.status = 'pending_payment' and b.created_at > now() - interval '45 minutes'))
      and m.starts_at < v_match.ends_at
      and m.ends_at > v_match.starts_at
  ) then
    raise exception 'Keeper is already booked at that time';
  end if;

  if p_terms_version is null or length(trim(p_terms_version)) = 0 then
    raise exception 'Terms must be accepted';
  end if;

  -- match_id es único: un solo intento de reserva por partido a la vez (el servidor limpia el pendiente anterior).
  insert into public.bookings (
    match_id, application_id, player_id, goalkeeper_id, rate,
    status, payment_status, terms_version, terms_accepted_at
  )
  values (
    v_match.id, p_application_id, v_match.created_by, v_application.goalkeeper_id, v_application.rate,
    'pending_payment', 'pending', trim(p_terms_version), now()
  )
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

revoke execute on function public.accept_application(uuid, text) from public, anon;
grant execute on function public.accept_application(uuid, text) to authenticated;

-- Se llama solo desde el servidor (webhook o página de retorno) con service_role. Idempotente.
create or replace function public.confirm_booking_payment(
  p_booking_id uuid,
  p_payment_intent text,
  p_charge text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
  m public.matches%rowtype;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found';
  end if;

  if b.status <> 'pending_payment' then
    return;
  end if;

  select * into m from public.matches where id = b.match_id;

  update public.bookings
  set status = 'confirmed',
      payment_status = 'held',
      stripe_payment_intent_id = p_payment_intent,
      stripe_charge_id = p_charge,
      confirmed_at = now(),
      auto_release_at = m.ends_at + interval '3 days'
  where id = b.id;

  update public.applications set status = 'accepted' where id = b.application_id;
  update public.applications
  set status = 'rejected'
  where match_id = b.match_id and id <> b.application_id and status = 'pending';
  update public.matches set status = 'assigned' where id = b.match_id;

  insert into public.booking_events (booking_id, type, data)
  values (b.id, 'payment_succeeded', jsonb_build_object('payment_intent', p_payment_intent, 'charge', p_charge));
end;
$$;

revoke execute on function public.confirm_booking_payment(uuid, text, text) from public, anon, authenticated;
grant execute on function public.confirm_booking_payment(uuid, text, text) to service_role;

-- El portero no ve la reserva hasta que está pagada; el jugador sí ve su intento pendiente.
drop policy if exists "bookings_select_participants" on public.bookings;
create policy "bookings_select_participants"
on public.bookings for select
to authenticated
using (
  player_id = auth.uid()
  or (goalkeeper_id = auth.uid() and status <> 'pending_payment')
);
