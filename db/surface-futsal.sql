-- Superficie "futsal": amplía el check de matches.surface. Se pega entero en el SQL Editor de Supabase.
-- Idempotente: se puede correr varias veces.

alter table public.matches drop constraint if exists matches_surface_check;
alter table public.matches
  add constraint matches_surface_check
  check (surface is null or surface in ('grass', 'artificial', 'indoor', 'futsal'));
