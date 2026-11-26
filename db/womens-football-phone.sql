-- Futbol masculino/femenino + movil del usuario. Se pega entero en el SQL Editor de Supabase. Idempotente.
-- Requiere haber corrido antes db/policies.sql y db/admin.sql (permisos por columna de profiles).
-- Correr en Preview y en Prod ANTES de desplegar el codigo que lo usa.

-- ============ Categoria: men | women ============
-- Cada perfil (porteros y jugadores) elige una. Los partidos heredan la de quien los publica y un
-- portero solo aplica a partidos de su categoria. Los perfiles y partidos existentes quedan en 'men'.
alter table public.profiles add column if not exists category text not null default 'men';
alter table public.profiles drop constraint if exists profiles_category_check;
alter table public.profiles
  add constraint profiles_category_check
  check (category in ('men', 'women'));
grant update (category) on table public.profiles to authenticated;
-- Se elige al registrarse, así que el perfil nace con ella.
grant insert (category) on table public.profiles to authenticated;

alter table public.matches add column if not exists category text not null default 'men';
alter table public.matches drop constraint if exists matches_category_check;
alter table public.matches
  add constraint matches_category_check
  check (category in ('men', 'women'));

-- El partido toma siempre la categoria de quien lo publica, mande lo que mande el cliente.
create or replace function public.set_match_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.category := coalesce((select p.category from public.profiles p where p.id = new.created_by), 'men');
  return new;
end;
$$;

drop trigger if exists matches_set_category on public.matches;
create trigger matches_set_category
before insert on public.matches
for each row execute function public.set_match_category();

-- Un portero solo aplica a partidos de su categoria. Trigger (y no la politica de insert)
-- para no tener que duplicar la politica que mantiene db/free-beta.sql.
create or replace function public.check_application_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select m.category from public.matches m where m.id = new.match_id)
     is distinct from (select p.category from public.profiles p where p.id = new.goalkeeper_id) then
    raise exception 'category_mismatch' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists applications_category_check on public.applications;
create trigger applications_category_check
before insert on public.applications
for each row execute function public.check_application_category();

-- ============ Movil ============
-- Tabla aparte: profiles la pueden leer otros usuarios; el movil solo su dueno y los admins.
create table if not exists public.profile_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  phone text not null,
  updated_at timestamptz not null default now()
);

alter table public.profile_contacts drop constraint if exists profile_contacts_phone_check;
alter table public.profile_contacts
  add constraint profile_contacts_phone_check
  check (phone ~ '^\+447[0-9]{9}$');

-- Instagram del portero (opcional): solo lo ven los admins, para verificar. Sin @, en minusculas.
alter table public.profile_contacts add column if not exists instagram text;
alter table public.profile_contacts drop constraint if exists profile_contacts_instagram_check;
alter table public.profile_contacts
  add constraint profile_contacts_instagram_check
  check (instagram is null or instagram ~ '^[a-z0-9._]{1,30}$');

alter table public.profile_contacts enable row level security;

grant select, insert, update, delete on table public.profile_contacts to authenticated;
grant all on table public.profile_contacts to service_role;

drop policy if exists "profile_contacts_select_own_or_admin" on public.profile_contacts;
create policy "profile_contacts_select_own_or_admin"
on public.profile_contacts for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "profile_contacts_insert_own" on public.profile_contacts;
create policy "profile_contacts_insert_own"
on public.profile_contacts for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "profile_contacts_update_own" on public.profile_contacts;
create policy "profile_contacts_update_own"
on public.profile_contacts for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "profile_contacts_delete_own" on public.profile_contacts;
create policy "profile_contacts_delete_own"
on public.profile_contacts for delete
to authenticated
using (profile_id = auth.uid());
