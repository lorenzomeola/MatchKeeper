-- Solicitudes de borrado de cuenta (db/docs: docs/privacy-support-operations.md, seccion 3).
-- Se pega entero en el SQL Editor de Supabase. Idempotente.
-- El usuario solo pide el borrado; el admin lo ejecuta a mano tras revisar reservas, denuncias y disputas.

create table if not exists public.deletion_requests (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now()
);

alter table public.deletion_requests enable row level security;

grant select, insert, delete on table public.deletion_requests to authenticated;
grant all on table public.deletion_requests to service_role;

-- Cada usuario ve, crea y retira solo la suya; los admins pueden verlas todas.
drop policy if exists "deletion_requests_select_own_or_admin" on public.deletion_requests;
create policy "deletion_requests_select_own_or_admin"
on public.deletion_requests for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "deletion_requests_insert_own" on public.deletion_requests;
create policy "deletion_requests_insert_own"
on public.deletion_requests for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "deletion_requests_delete_own" on public.deletion_requests;
create policy "deletion_requests_delete_own"
on public.deletion_requests for delete
to authenticated
using (profile_id = auth.uid());
