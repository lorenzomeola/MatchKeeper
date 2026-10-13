-- Beta gratuita sin pagos (PRODUCT_PLAN.md sección 13). Se pega entero en el SQL Editor de Supabase. Idempotente.
-- Requiere db/migrations/0015_*.sql (valor 'none' de payment_status), ejecutada ANTES y por separado,
-- y haber corrido db/payments.sql, db/booking-payments.sql y db/strikes.sql.
--
-- Un solo interruptor, `payments_enabled`, decide si las reservas se cobran. Apagado (beta): el equipo elige portero
-- y la reserva nace confirmada con payment_status = 'none', sin Stripe. Encendido: todo sigue como antes.
-- Para cambiarlo:  update public.app_settings set value = 'true' where key = 'payments_enabled';

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
revoke all on table public.app_settings from anon, authenticated;
grant all on table public.app_settings to service_role;

-- La beta arranca con los pagos apagados. Si la fila ya existe no se toca (on conflict do nothing).
insert into public.app_settings (key, value) values ('payments_enabled', 'false')
on conflict (key) do nothing;

-- Sin fila el comportamiento es el de siempre (pagos encendidos).
create or replace function public.payments_enabled()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select value = 'true' from public.app_settings where key = 'payments_enabled'), true);
$$;

grant execute on function public.payments_enabled() to anon, authenticated, service_role;

-- Sin pagos, un portero aprobado y sin suspender puede aplicar aunque no tenga cuenta de Stripe.
-- Esta política sustituye a la que antes vivía en db/payments.sql.
drop policy if exists "applications_insert_own_goalkeeper" on public.applications;
create policy "applications_insert_own_goalkeeper"
on public.applications for insert
to authenticated
with check (
  goalkeeper_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'goalkeeper' and p.approved = true
  )
  and (not public.payments_enabled() or public.keeper_can_get_paid(auth.uid()))
  and not public.keeper_is_suspended(auth.uid())
);

-- Elegir portero sin cobro: crea la reserva ya confirmada. Solo funciona con los pagos apagados; con ellos
-- encendidos hay que pasar por accept_application y Stripe, así que nadie puede saltarse el cobro llamando a esta.
create or replace function public.accept_application_free(p_application_id uuid, p_terms_version text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications%rowtype;
  v_match public.matches%rowtype;
  v_booking_id uuid;
  v_rate_pence integer;
  v_filled integer;
begin
  if public.payments_enabled() then
    raise exception 'Payments are enabled';
  end if;

  select * into v_application from public.applications where id = p_application_id;
  if not found then
    raise exception 'Application not found';
  end if;

  -- Bloquea el partido: dos reservas a la vez no pueden pasarse de la capacidad.
  select * into v_match from public.matches where id = v_application.match_id for update;
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

  if public.keeper_is_suspended(v_application.goalkeeper_id) then
    raise exception 'Keeper is suspended';
  end if;

  if exists (
    select 1
    from public.bookings b
    join public.matches m on m.id = b.match_id
    where b.goalkeeper_id = v_application.goalkeeper_id
      and b.match_id <> v_match.id
      and b.status in ('confirmed', 'under_review')
      and m.starts_at < v_match.ends_at
      and m.ends_at > v_match.starts_at
  ) then
    raise exception 'Keeper is already booked at that time';
  end if;

  if p_terms_version is null or length(trim(p_terms_version)) = 0 then
    raise exception 'Terms must be accepted';
  end if;

  if (select count(*) from public.bookings where match_id = v_match.id and status <> 'cancelled') >= v_match.keepers_needed then
    raise exception 'Match is full';
  end if;

  -- La tarifa se guarda solo como referencia: no hay comisión ni cobro.
  v_rate_pence := round(v_application.rate * 100)::int;

  insert into public.bookings (
    match_id, application_id, player_id, goalkeeper_id, rate, commission_pct,
    status, payment_status, terms_version, terms_accepted_at,
    rate_pence, platform_fee_pence, total_pence, keeper_payout_pence,
    confirmed_at, auto_release_at
  )
  values (
    v_match.id, p_application_id, v_match.created_by, v_application.goalkeeper_id, v_application.rate, 0,
    'confirmed', 'none', trim(p_terms_version), now(),
    v_rate_pence, 0, v_rate_pence, v_rate_pence,
    now(), v_match.ends_at + interval '3 days'
  )
  returning id into v_booking_id;

  update public.applications set status = 'accepted' where id = p_application_id;

  -- Las demás candidaturas solo se rechazan cuando se ocupa la última plaza.
  select count(*) into v_filled
  from public.bookings
  where match_id = v_match.id and status not in ('cancelled', 'pending_payment');

  if v_filled >= v_match.keepers_needed then
    update public.applications
    set status = 'rejected'
    where match_id = v_match.id and id <> p_application_id and status = 'pending';
    update public.matches set status = 'assigned' where id = v_match.id;
  end if;

  insert into public.booking_events (booking_id, type, actor_id, data)
  values (v_booking_id, 'confirmed_without_payment', auth.uid(), jsonb_build_object('rate_pence', v_rate_pence));

  return v_booking_id;
end;
$$;

revoke execute on function public.accept_application_free(uuid, text) from public, anon;
grant execute on function public.accept_application_free(uuid, text) to authenticated;
