-- Dashboards, fase 1: campos del partido, visibilidad entre participantes y lectura para admin.
-- Se pega entero en el SQL Editor de Supabase. Idempotente: se puede correr varias veces.

-- ============ matches: formato, superficie, notas ============
alter table public.matches add column if not exists format smallint;
alter table public.matches add column if not exists surface text;
alter table public.matches add column if not exists notes text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'matches_format_check') then
    alter table public.matches
      add constraint matches_format_check check (format is null or format between 5 and 11);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'matches_surface_check') then
    alter table public.matches
      add constraint matches_surface_check check (surface is null or surface in ('grass', 'artificial', 'indoor'));
  end if;
end $$;

-- ============ visibilidad de perfiles y equipos ============
-- Un portero necesita ver el nombre de quien publica un partido abierto, y cada parte
-- necesita ver a la otra cuando hay una aplicación. Se resuelve con funciones
-- SECURITY DEFINER para no crear ciclos de RLS entre profiles, matches y applications.
create or replace function public.shares_match_with(p_other uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.applications a
    join public.matches m on m.id = a.match_id
    where (m.created_by = auth.uid() and a.goalkeeper_id = p_other)
       or (a.goalkeeper_id = auth.uid() and m.created_by = p_other)
  );
$$;

create or replace function public.is_open_match_poster(p_profile uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.matches m
    where m.created_by = p_profile and m.status = 'open'
  );
$$;

grant execute on function public.shares_match_with(uuid) to authenticated;
grant execute on function public.is_open_match_poster(uuid) to authenticated;

drop policy if exists "profiles_select_related" on public.profiles;
create policy "profiles_select_related"
on public.profiles for select
to authenticated
using (public.shares_match_with(id) or public.is_open_match_poster(id));

drop policy if exists "teams_select_related" on public.teams;
create policy "teams_select_related"
on public.teams for select
to authenticated
using (public.shares_match_with(owner_id) or public.is_open_match_poster(owner_id));

-- ============ lectura para admin ============
grant select on table public.teams to authenticated;

drop policy if exists "matches_select_admin" on public.matches;
create policy "matches_select_admin"
on public.matches for select
to authenticated
using (public.is_admin());

drop policy if exists "applications_select_admin" on public.applications;
create policy "applications_select_admin"
on public.applications for select
to authenticated
using (public.is_admin());

drop policy if exists "bookings_select_admin" on public.bookings;
create policy "bookings_select_admin"
on public.bookings for select
to authenticated
using (public.is_admin());

drop policy if exists "teams_select_admin" on public.teams;
create policy "teams_select_admin"
on public.teams for select
to authenticated
using (public.is_admin());
