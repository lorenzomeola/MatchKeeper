-- Admin, fase 6: endurecimiento de permisos, aprobación de porteros por función y moderación de denuncias.
-- Se pega entero en el SQL Editor de Supabase. Idempotente: se puede correr varias veces.
-- Requiere haber corrido antes db/policies.sql, db/dashboards.sql y db/messaging.sql.
--
-- Por qué: hasta ahora las políticas de profiles permitían que cada usuario actualizara y creara SU fila
-- con cualquier columna. Desde el navegador, con su propia sesión, podía ponerse approved = true o
-- is_admin = true. Aquí se limita por columnas lo que el cliente puede escribir.

-- ============ profiles ============
revoke insert, update on table public.profiles from authenticated;

grant insert (id, role, display_name, city) on table public.profiles to authenticated;
grant update (display_name, avatar_url, bio, city, experience_years, level, player_kind, base_lat, base_lng)
  on table public.profiles to authenticated;

-- La aprobación solo la puede cambiar un admin, y solo a través de esta función.
create or replace function public.set_keeper_approval(p_profile uuid, p_approved boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  update public.profiles
  set approved = p_approved
  where id = p_profile and role = 'goalkeeper';
end;
$$;

grant execute on function public.set_keeper_approval(uuid, boolean) to authenticated;

drop policy if exists "profiles_update_admin" on public.profiles;

-- ============ applications ============
-- Un portero solo puede retirar su aplicación pendiente. Aceptar pasa siempre por accept_application().
-- Antes podía marcarse a sí mismo como aceptado y saltarse el bloqueo de datos de contacto del chat.
revoke update on table public.applications from authenticated;
grant update (status) on table public.applications to authenticated;

drop policy if exists "applications_update_own_or_match_owner" on public.applications;
drop policy if exists "applications_withdraw_own" on public.applications;
create policy "applications_withdraw_own"
on public.applications for update
to authenticated
using (goalkeeper_id = auth.uid() and status = 'pending')
with check (goalkeeper_id = auth.uid() and status = 'withdrawn');

-- ============ matches ============
-- La app no edita partidos todavía; el estado solo lo cambian las funciones del servidor.
revoke update on table public.matches from authenticated;

-- ============ reports ============
grant update (status) on table public.reports to authenticated;
drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
on public.reports for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
