-- Rango de edad: del portero (profiles.age_range) y preferencia opcional del partido (matches.pref_age_*).
-- Se pega entero en el SQL Editor de Supabase. Idempotente: se puede correr varias veces.
-- Requiere haber corrido antes db/admin.sql (que limita por columnas lo que el cliente puede actualizar).
-- Tramos: 18-24, 25-34, 35-44, 45-54, 55+. Solo mayores de 18.

alter table public.profiles add column if not exists age_range text;
alter table public.profiles drop constraint if exists profiles_age_range_check;
alter table public.profiles
  add constraint profiles_age_range_check
  check (age_range is null or age_range in ('18-24', '25-34', '35-44', '45-54', '55+'));

alter table public.matches add column if not exists pref_age_min text;
alter table public.matches add column if not exists pref_age_max text;
alter table public.matches drop constraint if exists matches_pref_age_min_check;
alter table public.matches
  add constraint matches_pref_age_min_check
  check (pref_age_min is null or pref_age_min in ('18-24', '25-34', '35-44', '45-54', '55+'));
alter table public.matches drop constraint if exists matches_pref_age_max_check;
alter table public.matches
  add constraint matches_pref_age_max_check
  check (pref_age_max is null or pref_age_max in ('18-24', '25-34', '35-44', '45-54', '55+'));

-- El cliente solo puede escribir las columnas concedidas (ver db/admin.sql). Se suma age_range.
grant update (age_range) on table public.profiles to authenticated;
