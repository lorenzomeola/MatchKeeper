-- Permisos + políticas RLS para MatchKeeper.
-- AVISO: este archivo es el punto de partida. Los permisos por columna de profiles, applications,
-- matches y messages los endurece db/admin.sql (y db/messaging.sql). Si vuelves a correr este archivo,
-- corre después db/messaging.sql, db/admin.sql, db/payments.sql y db/booking-payments.sql, en ese orden, o se restauran permisos demasiado amplios.
-- No se genera con Drizzle (no modela RLS); se versiona aquí y se aplica a
-- mano en el SQL Editor de Supabase, igual que la migración de esquema.
-- Idempotente: se puede volver a correr entero sin error (drop if exists
-- antes de cada create policy).
--
-- Reglas de acceso (ver PRODUCT_PLAN.md §2-§9):
-- - Todo requiere sesión (rol "authenticated"); no se otorgan permisos a "anon".
-- - Cada usuario gestiona su propio profile/team/match/application.
-- - Los porteros aprobados son visibles para navegar partidos/aplicar.
-- - bookings/strikes se escriben solo vía funciones server-side (RPC) o
--   Route Handlers con service_role — el cliente solo puede LEER.

-- ============ profiles ============
grant select, insert, update on table public.profiles to authenticated;

drop policy if exists "profiles_select_own_or_approved_goalkeeper" on public.profiles;
create policy "profiles_select_own_or_approved_goalkeeper"
on public.profiles for select
to authenticated
using (id = auth.uid() or (role = 'goalkeeper' and approved = true));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- SECURITY DEFINER porque un `exists (select ... from profiles ...)` dentro
-- de una politica DE profiles se auto-referencia y causa recursion infinita
-- (peor aun que el ciclo entre 2 tablas: aqui es la MISMA tabla).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

grant execute on function public.is_admin() to authenticated;

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
on public.profiles for select
to authenticated
using (public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Funciones SECURITY DEFINER para romper el ciclo de RLS entre teams <-> team_members
-- (la politica de teams necesita consultar team_members y viceversa; sin esto,
-- Postgres tira "infinite recursion detected in policy"). Al ser SECURITY DEFINER
-- corren con los privilegios del dueño de la funcion y no vuelven a disparar las
-- políticas de la tabla que consultan, cortando la recursión.
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_team_owner(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.teams
    where id = p_team_id and owner_id = auth.uid()
  );
$$;

grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_owner(uuid) to authenticated;

-- ============ teams ============
grant select, insert, update, delete on table public.teams to authenticated;

drop policy if exists "teams_select_owner_or_member" on public.teams;
create policy "teams_select_owner_or_member"
on public.teams for select
to authenticated
using (
  owner_id = auth.uid()
  or public.is_team_member(id)
);

drop policy if exists "teams_insert_own" on public.teams;
create policy "teams_insert_own"
on public.teams for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "teams_update_delete_owner" on public.teams;
create policy "teams_update_delete_owner"
on public.teams for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "teams_delete_owner" on public.teams;
create policy "teams_delete_owner"
on public.teams for delete
to authenticated
using (owner_id = auth.uid());

-- ============ team_members ============
grant select, insert, delete on table public.team_members to authenticated;

drop policy if exists "team_members_select_owner_or_self" on public.team_members;
create policy "team_members_select_owner_or_self"
on public.team_members for select
to authenticated
using (
  profile_id = auth.uid()
  or public.is_team_owner(team_id)
);

drop policy if exists "team_members_insert_owner" on public.team_members;
create policy "team_members_insert_owner"
on public.team_members for insert
to authenticated
with check (public.is_team_owner(team_id));

drop policy if exists "team_members_delete_owner_or_self" on public.team_members;
create policy "team_members_delete_owner_or_self"
on public.team_members for delete
to authenticated
using (
  profile_id = auth.uid()
  or public.is_team_owner(team_id)
);

-- ============ matches ============
grant select, insert, update on table public.matches to authenticated;

-- SECURITY DEFINER por la misma razon que is_team_member/is_team_owner: si
-- la politica de matches consultara `applications` con un subquery directo,
-- y la de applications ya consulta `matches`, se forma otro ciclo de
-- recursion infinita entre las dos tablas.
create or replace function public.has_accepted_application(p_match_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.applications
    where match_id = p_match_id and goalkeeper_id = auth.uid() and status = 'accepted'
  );
$$;

grant execute on function public.has_accepted_application(uuid) to authenticated;

drop policy if exists "matches_select_open_or_own_or_team" on public.matches;
create policy "matches_select_open_or_own_or_team"
on public.matches for select
to authenticated
using (
  status = 'open'
  or created_by = auth.uid()
  or (team_id is not null and public.is_team_member(team_id))
  or public.has_accepted_application(id)
);

drop policy if exists "matches_insert_own" on public.matches;
create policy "matches_insert_own"
on public.matches for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "matches_update_own" on public.matches;
create policy "matches_update_own"
on public.matches for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- ============ applications ============
grant select, insert, update on table public.applications to authenticated;

drop policy if exists "applications_select_own_or_match_owner" on public.applications;
create policy "applications_select_own_or_match_owner"
on public.applications for select
to authenticated
using (
  goalkeeper_id = auth.uid()
  or exists (select 1 from public.matches m where m.id = match_id and m.created_by = auth.uid())
);

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
);

drop policy if exists "applications_update_own_or_match_owner" on public.applications;
create policy "applications_update_own_or_match_owner"
on public.applications for update
to authenticated
using (
  goalkeeper_id = auth.uid()
  or exists (select 1 from public.matches m where m.id = match_id and m.created_by = auth.uid())
)
with check (
  goalkeeper_id = auth.uid()
  or exists (select 1 from public.matches m where m.id = match_id and m.created_by = auth.uid())
);

-- ============ bookings (solo lectura desde el cliente) ============
grant select on table public.bookings to authenticated;

drop policy if exists "bookings_select_participants" on public.bookings;
create policy "bookings_select_participants"
on public.bookings for select
to authenticated
using (player_id = auth.uid() or goalkeeper_id = auth.uid());

-- ============ reviews ============
grant select, insert on table public.reviews to authenticated;

drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all"
on public.reviews for select
to authenticated
using (true);

drop policy if exists "reviews_insert_reviewer_of_booking" on public.reviews;
create policy "reviews_insert_reviewer_of_booking"
on public.reviews for insert
to authenticated
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.player_id = auth.uid() and b.payment_status = 'released'
  )
);

-- ============ messages ============
grant select, insert on table public.messages to authenticated;

-- Habilita Realtime (Postgres Changes) para que el chat reciba mensajes en
-- vivo sin recargar la página. Guardado con IF NOT EXISTS manual porque
-- ALTER PUBLICATION ... ADD TABLE no es idempotente (falla si ya está).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

drop policy if exists "messages_select_match_participants" on public.messages;
create policy "messages_select_match_participants"
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.id = match_id
      and (
        m.created_by = auth.uid()
        or exists (
          select 1 from public.applications a
          where a.match_id = m.id and a.goalkeeper_id = auth.uid() and a.status = 'accepted'
        )
      )
  )
);

drop policy if exists "messages_insert_own_as_participant" on public.messages;
create policy "messages_insert_own_as_participant"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.matches m
    where m.id = match_id
      and (
        m.created_by = auth.uid()
        or exists (
          select 1 from public.applications a
          where a.match_id = m.id and a.goalkeeper_id = auth.uid() and a.status = 'accepted'
        )
      )
  )
);

-- ============ strikes (solo lectura, se escriben vía service_role) ============
grant select on table public.strikes to authenticated;

drop policy if exists "strikes_select_own" on public.strikes;
create policy "strikes_select_own"
on public.strikes for select
to authenticated
using (goalkeeper_id = auth.uid());

-- ============ accept_application (RPC) ============
-- Vive en db/booking-payments.sql: elegir portero crea una reserva pendiente de pago, no confirmada.
-- No se redefine aquí para que volver a correr este archivo no restaure la versión sin cobro.
