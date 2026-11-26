-- Clips de porteros (opcionales): ayudan al admin a verificar y a los equipos a elegir.
-- Se pega entero en el SQL Editor de Supabase. Idempotente.
--
-- Bucket privado: los equipos los ven con enlaces temporales que firma el servidor, solo si pueden ver
-- el perfil del portero. Hasta 3 clips de 50 MB por portero, en keeper-videos/<auth.uid()>/archivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'keeper-videos',
  'keeper-videos',
  false,
  52428800,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Cuantos clips tiene ya el usuario. SECURITY DEFINER para no depender de la politica de select al contar.
create or replace function public.keeper_video_count(p_owner uuid)
returns integer
language sql
security definer
set search_path = public, storage
stable
as $$
  select count(*)::integer from storage.objects
  where bucket_id = 'keeper-videos' and (storage.foldername(name))[1] = p_owner::text;
$$;

revoke all on function public.keeper_video_count(uuid) from public;
grant execute on function public.keeper_video_count(uuid) to authenticated;

drop policy if exists "keeper_videos_insert_own_folder" on storage.objects;
create policy "keeper_videos_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'keeper-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'goalkeeper')
  and public.keeper_video_count(auth.uid()) < 3
);

-- El dueno lista y firma los suyos; los demas los reciben firmados desde el servidor.
drop policy if exists "keeper_videos_select_own_folder" on storage.objects;
create policy "keeper_videos_select_own_folder"
on storage.objects for select
to authenticated
using (
  bucket_id = 'keeper-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "keeper_videos_delete_own_folder" on storage.objects;
create policy "keeper_videos_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'keeper-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
