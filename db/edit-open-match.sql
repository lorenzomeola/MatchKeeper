-- Editar un partido abierto propio. Se pega entero en el SQL Editor de Supabase. Idempotente.
-- Sin portero reservado se puede cambiar todo; con uno reservado (o un pago en curso) solo las notas.
-- updated_at marca el último cambio relevante (no las notas): enciende el punto de "nuevo" a los porteros.

alter table public.matches add column if not exists updated_at timestamptz;

create or replace function public.update_open_match(
  p_match_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_format smallint,
  p_surface text,
  p_level text,
  p_budget numeric,
  p_keepers smallint,
  p_age_min text,
  p_age_max text,
  p_notes text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches%rowtype;
  v_changed boolean;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found or m.created_by is distinct from auth.uid() then
    raise exception 'Match not found';
  end if;
  if m.status <> 'open' or m.ends_at <= now() then
    raise exception 'Only upcoming open matches can be edited';
  end if;

  v_changed := (m.starts_at, m.ends_at, m.address, m.lat, m.lng, m.format, m.surface, m.level, m.budget_suggested, m.keepers_needed, m.pref_age_min, m.pref_age_max)
    is distinct from
    (p_starts_at, p_ends_at, p_address, p_lat, p_lng, p_format, p_surface, p_level, p_budget, p_keepers, p_age_min, p_age_max);

  if v_changed then
    if exists (select 1 from public.bookings where match_id = m.id and status <> 'cancelled') then
      raise exception 'A keeper is already booked: only the notes can be edited';
    end if;
    if p_starts_at <= now() or p_ends_at <= p_starts_at then
      raise exception 'Choose a start time in the future';
    end if;
    update public.matches
    set starts_at = p_starts_at, ends_at = p_ends_at, address = p_address, lat = p_lat, lng = p_lng,
        format = p_format, surface = p_surface, level = p_level, budget_suggested = p_budget,
        keepers_needed = p_keepers, pref_age_min = p_age_min, pref_age_max = p_age_max,
        notes = p_notes, updated_at = now()
    where id = m.id;
  else
    update public.matches set notes = p_notes where id = m.id;
  end if;

  return v_changed;
end;
$$;

revoke execute on function public.update_open_match(uuid, timestamptz, timestamptz, text, double precision, double precision, smallint, text, text, numeric, smallint, text, text, text) from public, anon;
grant execute on function public.update_open_match(uuid, timestamptz, timestamptz, text, double precision, double precision, smallint, text, text, numeric, smallint, text, text, text) to authenticated;
