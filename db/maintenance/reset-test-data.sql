-- Solo Preview mzliunqgszmxhwtgnbgy: deja 3 cuentas existentes con sus perfiles y contrasenas.
-- Se pega entero en el SQL Editor de Supabase. Cuando v_dry_run es false, borra de verdad y no se puede deshacer.
--
-- 1. Comprueba las tres identidades exactas de Preview (emails Y UUIDs); nunca adaptar a Production.
--    Antes, reconcilia email_outbox con Resend y cancela cualquier envio futuro por API.
--    Borra por Storage UI/API solo las fotos de cuentas eliminadas; nunca storage.objects por SQL.
-- 2. Córrelo tal cual (v_dry_run = true). No cambia nada: termina con un error que lista lo que se borraría.
-- 3. Si la lista es correcta, pon v_dry_run := false y córrelo otra vez.
--
-- Qué borra
--   Para todos los usuarios, también los que se quedan: partidos, aplicaciones, reservas, mensajes,
--   lecturas de chat, chat con MatchKeeper, reseñas, denuncias, bloqueos y strikes.
--   De los usuarios que NO están en la lista: perfil, equipo, miembros de equipo y la cuenta de acceso
--   (auth.users), incluidos los usuarios reales que se hayan registrado.
-- Qué no toca
--   Las cuentas de la lista (y sus equipos, perfiles y conexiones Stripe sandbox), estructura y politicas.
--   App settings, fotos conservadas y recursos externos de Stripe/Resend no se borran por SQL.

do $$
declare
  v_dry_run boolean := true;
  v_keep_emails text[] := array[
    'matchkeeperuk+staging@gmail.com',
    'lorenzomeolav32@gmail.com',
    'lorenzomeolav@hotmail.com'
  ];
  v_keep_ids uuid[] := array[
    'f9a162b4-8517-4294-9cfe-932d75184068'::uuid,
    '248d1d65-0799-4d9f-b269-278c99d5178a'::uuid,
    '43d6c7ce-4124-40c9-bccc-15528285e9da'::uuid
  ];

  v_keep uuid[];
  v_found int;
  v_has_admin boolean;
  v_summary text;
  v_before jsonb;
  v_after jsonb;
begin
  if not exists (
    select 1 from auth.users u join public.profiles p on p.id = u.id
    where u.id = v_keep_ids[1] and lower(u.email) = v_keep_emails[1]
      and u.email_confirmed_at is not null and p.is_admin
  ) or not exists (
    select 1 from auth.users u join public.profiles p on p.id = u.id
    where u.id = v_keep_ids[2] and lower(u.email) = v_keep_emails[2]
      and u.email_confirmed_at is not null and p.role = 'player' and not p.is_admin
  ) or not exists (
    select 1 from auth.users u join public.profiles p on p.id = u.id
    where u.id = v_keep_ids[3] and lower(u.email) = v_keep_emails[3]
      and u.email_confirmed_at is not null and p.role = 'goalkeeper' and not p.is_admin
  ) then
    raise exception 'No coincide la identidad Preview confirmada de admin/jugador/portero. No ejecutar en Production.';
  end if;

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

  if exists (
    select 1 from public.email_outbox
    where status not in ('sent', 'cancelled', 'failed')
      or (status = 'failed' and provider_id is not null)
  ) then
    raise exception 'Reconciliar correos pendientes/ambiguos con Resend ANTES del reset.';
  end if;
  if exists (
    select 1 from storage.objects
    where bucket_id = 'checkin-photos'
      or (bucket_id = 'avatars' and split_part(name, '/', 1) <> all (
        select id::text from unnest(v_keep_ids) id
      ))
  ) then
    raise exception 'Limpiar archivos de cuentas eliminadas y fotos de check-in por Storage UI/API antes del reset.';
  end if;

  select jsonb_agg(jsonb_build_object('id', u.id, 'password', u.encrypted_password, 'profile', to_jsonb(p)) order by u.id)
  into v_before from auth.users u join public.profiles p on p.id = u.id where u.id = any(v_keep_ids);

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

  -- Sin CASCADE: una dependencia nueva debe bloquear el reset en vez de borrarse implicitamente.
  truncate table
    public.email_outbox,
    public.keeper_debt_deductions,
    public.keeper_debts,
    public.disputes,
    public.booking_events,
    public.stripe_events,
    public.messages,
    public.message_reads,
    public.support_messages,
    public.support_threads,
    public.reports,
    public.blocks,
    public.strikes,
    public.reviews,
    public.bookings,
    public.applications,
    public.matches
  restart identity;

  -- Usuarios que no se quedan.
  delete from public.team_members
  where profile_id <> all (v_keep) or team_id in (select id from public.teams where owner_id <> all (v_keep));
  delete from public.teams where owner_id <> all (v_keep);
  delete from public.keeper_stripe_accounts where profile_id <> all (v_keep);
  delete from public.profiles where id <> all (v_keep);
  delete from auth.users where id <> all (v_keep);

  select jsonb_agg(jsonb_build_object('id', u.id, 'password', u.encrypted_password, 'profile', to_jsonb(p)) order by u.id)
  into v_after from auth.users u join public.profiles p on p.id = u.id where u.id = any(v_keep_ids);
  if v_before is distinct from v_after
    or (select count(*) from auth.users) <> 3
    or (select count(*) from public.profiles) <> 3 then
    raise exception 'Validacion final fallida: transaccion revertida.';
  end if;

  raise notice 'Listo. %', v_summary;
end $$;
