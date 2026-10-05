-- Borra los datos de prueba y deja solo 3 cuentas (admin, un portero, un jugador).
-- Se pega entero en el SQL Editor de Supabase. Cuando v_dry_run es false, borra de verdad y no se puede deshacer.
--
-- 1. Cambia los 3 correos de v_keep_emails por los de las cuentas que quieres conservar.
-- 2. Córrelo tal cual (v_dry_run = true). No cambia nada: termina con un error que lista lo que se borraría.
-- 3. Si la lista es correcta, pon v_dry_run := false y córrelo otra vez.
--
-- Qué borra
--   Para todos los usuarios, también los que se quedan: partidos, aplicaciones, reservas, mensajes,
--   lecturas de chat, reseñas, denuncias, bloqueos y strikes.
--   De los usuarios que NO están en la lista: perfil, equipo, miembros de equipo y la cuenta de acceso
--   (auth.users), incluidos los usuarios reales que se hayan registrado.
-- Qué no toca
--   Las cuentas de la lista (y sus equipos y perfiles), la estructura y las políticas.
--   Las fotos de perfil ya subidas siguen en Storage > avatars: Supabase no deja borrarlas por SQL,
--   se quitan desde el panel (Storage) si quieres.

do $$
declare
  v_dry_run boolean := true;
  v_keep_emails text[] := array[
    'matchkeeperuk@gmail.com',
    'prueba2@email.com',
    'prueba6@email.com'
  ];

  v_keep uuid[];
  v_found int;
  v_has_admin boolean;
  v_summary text;
begin
  select array_agg(id) into v_keep
  from auth.users
  where lower(email) in (select lower(e) from unnest(v_keep_emails) as e);

  v_found := coalesce(array_length(v_keep, 1), 0);
  if v_found <> array_length(v_keep_emails, 1) then
    raise exception 'Se esperaban % cuentas y se encontraron %. Revisa los correos de v_keep_emails.',
      array_length(v_keep_emails, 1), v_found;
  end if;

  select exists (select 1 from public.profiles where id = any (v_keep) and is_admin) into v_has_admin;
  if not v_has_admin then
    raise exception 'Ninguna de las cuentas a conservar es admin. Incluye la del admin o te quedas sin /admin.';
  end if;

  select format(
    E'Se borrarían: %s usuarios (%s), %s partidos, %s aplicaciones, %s reservas, %s mensajes, %s reseñas, %s denuncias.',
    (select count(*) from auth.users where id <> all (v_keep)),
    coalesce((select string_agg(email, ', ' order by email) from auth.users where id <> all (v_keep)), 'ninguno'),
    (select count(*) from public.matches),
    (select count(*) from public.applications),
    (select count(*) from public.bookings),
    (select count(*) from public.messages),
    (select count(*) from public.reviews),
    (select count(*) from public.reports)
  ) into v_summary;

  if v_dry_run then
    raise exception E'SIMULACRO, no se cambió nada.\n%\nSe conservan: %', v_summary, array_to_string(v_keep_emails, ', ');
  end if;

  -- Datos de uso, para todos.
  truncate table
    public.messages,
    public.message_reads,
    public.reports,
    public.blocks,
    public.strikes,
    public.reviews,
    public.bookings,
    public.applications,
    public.matches
  restart identity cascade;

  -- Usuarios que no se quedan.
  delete from public.team_members
  where profile_id <> all (v_keep) or team_id in (select id from public.teams where owner_id <> all (v_keep));
  delete from public.teams where owner_id <> all (v_keep);
  delete from public.profiles where id <> all (v_keep);
  delete from auth.users where id <> all (v_keep);

  raise notice 'Listo. %', v_summary;
end $$;
