-- Avisos de novedades: punto en "Explore" para porteros y contador de aplicaciones nuevas para equipos.
-- Se pega entero en el SQL Editor de Supabase. Idempotente.

-- Porteros: cuando abrieron Explore por ultima vez. null = nunca, todo lo abierto cuenta como nuevo.
alter table public.profiles add column if not exists explore_seen_at timestamptz;
grant update (explore_seen_at) on table public.profiles to authenticated;

-- Equipos: cuando vieron por ultima vez los porteros que aplicaron a cada partido.
alter table public.matches add column if not exists applications_seen_at timestamptz;

-- El cliente no puede actualizar matches (db/admin.sql); solo el dueno del partido marca como vistas sus aplicaciones.
create or replace function public.mark_applications_seen(p_match uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.matches set applications_seen_at = now()
  where id = p_match and created_by = auth.uid();
$$;

revoke all on function public.mark_applications_seen(uuid) from public;
grant execute on function public.mark_applications_seen(uuid) to authenticated;

-- Tiempo real: el menú se actualiza al llegar una aplicación o un partido nuevo. RLS decide quién recibe cada fila.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'applications') then
    alter publication supabase_realtime add table public.applications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches') then
    alter publication supabase_realtime add table public.matches;
  end if;
end;
$$;
