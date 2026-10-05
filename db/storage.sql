-- Perfil completo: columnas nuevas + bucket de fotos de perfil.
-- Se pega entero en el SQL Editor de Supabase. Idempotente.
-- Las columnas equivalen a la migración 0003 de Drizzle (con "if not exists"
-- para poder correrlo aunque ya se haya aplicado).

alter table public.profiles add column if not exists experience_years integer;
alter table public.profiles add column if not exists level text;
alter table public.profiles add column if not exists player_kind text;

-- Bucket público de lectura: las fotos de los porteros las ven los equipos
-- antes de aceptar. Límite de 5 MB y solo JPEG/PNG/WebP (MASTER.md, decisión 7).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Escritura solo dentro de la carpeta propia: avatars/<auth.uid()>/archivo.
drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
