-- Strikes y suspensión de porteros. Se pega entero en el SQL Editor de Supabase DESPUÉS de db/migrations/0010_*.sql. Idempotente.
-- Después hay que volver a correr db/payments.sql, db/booking-payments.sql y db/cancellations.sql, que usan estas funciones.
--
-- Regla (la misma que lib/strikes.ts): no_show = 3 puntos durante 365 días, late_cancel = 1 punto durante 90 días.
-- Los strikes anulados (waived_at) no cuentan. Con 3 puntos o más el portero está suspendido. No hay campo "suspendido":
-- se calcula, así anular un strike lo reactiva sin más pasos.

create or replace function public.keeper_strike_points(p_keeper uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(
    case
      when kind = 'no_show' and created_at > now() - interval '365 days' then 3
      when coalesce(kind, 'late_cancel') <> 'no_show' and created_at > now() - interval '90 days' then 1
      else 0
    end
  ), 0)::integer
  from public.strikes
  where goalkeeper_id = p_keeper and waived_at is null;
$$;

-- Los puntos exactos no se exponen: solo el servidor y las funciones internas los leen.
revoke execute on function public.keeper_strike_points(uuid) from public, anon, authenticated;
grant execute on function public.keeper_strike_points(uuid) to service_role;

-- Las políticas se evalúan con el rol del usuario, así que este sí necesita permiso. Solo devuelve sí o no.
create or replace function public.keeper_is_suspended(p_keeper uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.keeper_strike_points(p_keeper) >= 3;
$$;

revoke execute on function public.keeper_is_suspended(uuid) from public, anon;
grant execute on function public.keeper_is_suspended(uuid) to authenticated, service_role;

-- Los admins leen todos los strikes; el portero lee los suyos (strikes_select_own, en policies.sql).
drop policy if exists "strikes_select_admin" on public.strikes;
create policy "strikes_select_admin"
on public.strikes for select
to authenticated
using (public.is_admin());
