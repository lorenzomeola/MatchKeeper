-- Foto opcional del check-in: columnas, bucket PRIVADO y selección de fotos caducadas. Se pega entero en el SQL Editor de Supabase. Idempotente.
--
-- La foto no tiene ninguna política de Storage: ni el navegador ni usuarios autenticados pueden leer ni escribir el bucket.
-- Solo el servidor (clave de servicio) la sube y genera enlaces temporales, y solo para el equipo de la reserva, el portero y los admin.
-- Se borra a los 120 días del final del partido, igual que las coordenadas (Política de privacidad, sección 7).

alter table public.bookings add column if not exists check_in_photo_path text;
alter table public.bookings add column if not exists check_in_photo_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('checkin-photos', 'checkin-photos', false, 1048576, array['image/jpeg'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Fotos que ya toca borrar. Con una disputa abierta se esperan hasta que se resuelva. La ejecuta el cron diario.
create or replace function public.checkin_photos_to_purge()
returns table (booking_id uuid, photo_path text)
language sql
security definer
set search_path = public
as $$
  select b.id, b.check_in_photo_path
  from public.bookings b
  join public.matches m on m.id = b.match_id
  where b.check_in_photo_path is not null
    and m.ends_at < now() - interval '120 days'
    and not exists (
      select 1 from public.disputes d
      where d.booking_id = b.id
        and d.status in ('needs_response', 'warning_needs_response', 'under_review', 'warning_under_review')
    );
$$;

revoke execute on function public.checkin_photos_to_purge() from public, anon, authenticated;
grant execute on function public.checkin_photos_to_purge() to service_role;
