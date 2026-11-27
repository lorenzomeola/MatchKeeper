-- Un jugador no puede tener dos partidos ABIERTOS a la misma hora en el mismo sitio.
-- Se pega entero en el SQL Editor de Supabase. Idempotente.
-- Si ya hay duplicados abiertos, el índice falla: cancela antes los sobrantes. Para listarlos:
--   select created_by, starts_at, lower(btrim(address)), count(*), array_agg(id)
--   from public.matches where status = 'open'
--   group by 1, 2, 3 having count(*) > 1;

create unique index if not exists matches_one_open_per_slot_idx
  on public.matches (created_by, starts_at, lower(btrim(address)))
  where status = 'open';
