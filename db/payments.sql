-- Pagos (PAYMENTS_SPEC.md): permisos, RLS y backfill de las tablas/columnas de la migración 0007.
-- Se pega entero en el SQL Editor de Supabase DESPUÉS de db/migrations/0007_*.sql. Idempotente.
-- Todo lo de pagos lo escribe solo el servidor con la clave de servicio (service_role se salta RLS).

-- Las tablas creadas desde el SQL Editor no heredan permisos para service_role: se conceden aquí.
grant all on all tables in schema public to service_role;

-- ============ keeper_stripe_accounts ============
-- Aparte de profiles porque profiles es legible por los equipos; esto solo lo lee su dueño o un admin.
alter table public.keeper_stripe_accounts enable row level security;
revoke all on table public.keeper_stripe_accounts from anon, authenticated;
grant select on table public.keeper_stripe_accounts to authenticated;

drop policy if exists "keeper_stripe_accounts_select_own_or_admin" on public.keeper_stripe_accounts;
create policy "keeper_stripe_accounts_select_own_or_admin"
on public.keeper_stripe_accounts for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

-- ============ booking_events (solo admins leen) ============
alter table public.booking_events enable row level security;
revoke all on table public.booking_events from anon, authenticated;
grant select on table public.booking_events to authenticated;

drop policy if exists "booking_events_select_admin" on public.booking_events;
create policy "booking_events_select_admin"
on public.booking_events for select
to authenticated
using (public.is_admin());

-- Solo se inserta: nadie edita el registro de auditoría. DELETE queda libre para los borrados en cascada.
create or replace function public.booking_events_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'booking_events is append-only';
end;
$$;

drop trigger if exists booking_events_no_update on public.booking_events;
create trigger booking_events_no_update
before update on public.booking_events
for each row execute function public.booking_events_immutable();

-- ============ disputes (solo admins leen) ============
alter table public.disputes enable row level security;
revoke all on table public.disputes from anon, authenticated;
grant select on table public.disputes to authenticated;

drop policy if exists "disputes_select_admin" on public.disputes;
create policy "disputes_select_admin"
on public.disputes for select
to authenticated
using (public.is_admin());

-- ============ stripe_events (nadie desde el cliente) ============
alter table public.stripe_events enable row level security;
revoke all on table public.stripe_events from anon, authenticated;

-- ============ solo porteros con pagos habilitados y sin suspender pueden aplicar ============
-- Requiere db/strikes.sql (keeper_is_suspended).
-- SECURITY DEFINER para no depender de las políticas de keeper_stripe_accounts dentro de la de applications.
create or replace function public.keeper_can_get_paid(p_keeper uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.keeper_stripe_accounts
    where profile_id = p_keeper and payouts_enabled = true
  );
$$;

grant execute on function public.keeper_can_get_paid(uuid) to authenticated;

-- La política de insert de applications (que usa keeper_can_get_paid) vive ahora en db/free-beta.sql,
-- porque depende del interruptor payments_enabled(). Corre free-beta.sql después de este archivo.

-- ============ backfill de importes en bookings existentes ============
-- Las reservas anteriores a los pagos solo tienen `rate` en libras. Se rellenan los peniques una vez.
update public.bookings
set
  rate_pence = round(rate * 100)::int,
  platform_fee_pence = round(round(rate * 100) * commission_pct / 100)::int,
  total_pence = (round(rate * 100) + round(round(rate * 100) * commission_pct / 100))::int,
  keeper_payout_pence = round(rate * 100)::int
where rate_pence is null;
