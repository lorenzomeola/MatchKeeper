-- Mensajes, fase 2: un hilo 1 a 1 por aplicación, que empieza el equipo, con bloqueo de
-- datos de contacto antes de aceptar, límite de envío, bloqueo y denuncia.
-- Se pega entero en el SQL Editor de Supabase. Idempotente: se puede correr varias veces.
-- Requiere haber corrido antes db/policies.sql y db/dashboards.sql.

-- ============ esquema ============
alter table public.messages
  add column if not exists application_id uuid references public.applications(id) on delete cascade;

create index if not exists messages_application_created_idx
  on public.messages (application_id, created_at);

create table if not exists public.message_reads (
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (application_id, user_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table public.message_reads enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- ============ participante de un hilo ============
-- SECURITY DEFINER por la misma razón que las otras funciones de RLS: evita ciclos
-- entre messages, applications y matches.
create or replace function public.is_application_participant(p_application_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.applications a
    join public.matches m on m.id = a.match_id
    where a.id = p_application_id
      and (a.goalkeeper_id = auth.uid() or m.created_by = auth.uid())
  );
$$;

grant execute on function public.is_application_participant(uuid) to authenticated;

-- ============ políticas ============
-- Los mensajes ya no se insertan desde el cliente: pasan siempre por send_message().
revoke insert on table public.messages from authenticated;
drop policy if exists "messages_insert_own_as_participant" on public.messages;
drop policy if exists "messages_select_match_participants" on public.messages;
drop policy if exists "messages_select_thread_participants" on public.messages;
create policy "messages_select_thread_participants"
on public.messages for select
to authenticated
using (
  application_id is not null
  and (public.is_application_participant(application_id) or public.is_admin())
);

grant select on table public.message_reads to authenticated;
drop policy if exists "message_reads_select_participants" on public.message_reads;
create policy "message_reads_select_participants"
on public.message_reads for select
to authenticated
using (public.is_application_participant(application_id));

grant select, insert, delete on table public.blocks to authenticated;
drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own" on public.blocks for select to authenticated using (blocker_id = auth.uid());
drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

grant select, insert on table public.reports to authenticated;
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
on public.reports for insert
to authenticated
with check (reporter_id = auth.uid());
drop policy if exists "reports_select_own_or_admin" on public.reports;
create policy "reports_select_own_or_admin"
on public.reports for select
to authenticated
using (reporter_id = auth.uid() or public.is_admin());

-- ============ Realtime ============
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_reads'
  ) then
    alter publication supabase_realtime add table public.message_reads;
  end if;
end $$;

-- ============ detección de datos de contacto ============
create or replace function public.contains_contact_info(p_text text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_phone text;
begin
  if p_text ~* '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' then return true; end if;
  if p_text ~* '(https?://|www\.)' then return true; end if;
  if p_text ~* '\m[[:alnum:]-]+\.(com|co\.uk|uk|net|org|io|app|me|ly)\M' then return true; end if;
  if p_text ~* '\m(whats ?app|telegram|instagram|insta|snapchat|signal|facebook|messenger)\M' then return true; end if;

  -- Un teléfono son 9 o más dígitos seguidos, con espacios, guiones o paréntesis entre ellos.
  for v_phone in
    select (regexp_matches(p_text, '(\+?[0-9][0-9 ().-]{7,}[0-9])', 'g'))[1]
  loop
    if length(regexp_replace(v_phone, '[^0-9]', '', 'g')) >= 9 then return true; end if;
  end loop;

  return false;
end;
$$;

-- ============ enviar mensaje ============
create or replace function public.send_message(p_application_id uuid, p_body text)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_app public.applications%rowtype;
  v_match public.matches%rowtype;
  v_body text := btrim(coalesce(p_body, ''));
  v_other uuid;
  v_row public.messages;
begin
  if v_uid is null then
    raise exception 'Log in to send messages.';
  end if;

  select * into v_app from public.applications where id = p_application_id;
  if not found then
    raise exception 'Conversation not found.';
  end if;
  select * into v_match from public.matches where id = v_app.match_id;

  if v_uid = v_match.created_by then
    v_other := v_app.goalkeeper_id;
  elsif v_uid = v_app.goalkeeper_id then
    v_other := v_match.created_by;
  else
    raise exception 'You are not part of this conversation.';
  end if;

  if v_body = '' then
    raise exception 'Write a message first.';
  end if;
  if char_length(v_body) > 1000 then
    raise exception 'Messages are limited to 1000 characters.';
  end if;

  if v_app.status in ('rejected', 'withdrawn') or v_match.status = 'cancelled' then
    raise exception 'This conversation is closed.';
  end if;

  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_uid and b.blocked_id = v_other)
       or (b.blocker_id = v_other and b.blocked_id = v_uid)
  ) then
    raise exception 'You can''t message this person.';
  end if;

  -- El equipo escribe primero; el portero responde.
  if v_uid = v_app.goalkeeper_id
     and v_app.status <> 'accepted'
     and not exists (select 1 from public.messages where application_id = p_application_id) then
    raise exception 'The team needs to message you first.';
  end if;

  if v_app.status <> 'accepted' and public.contains_contact_info(v_body) then
    raise exception 'Phone numbers, emails and links can be shared once a keeper is booked.';
  end if;

  if (
    select count(*) from public.messages
    where sender_id = v_uid and created_at > now() - interval '1 minute'
  ) >= 10 then
    raise exception 'You are sending messages too fast. Wait a moment and try again.';
  end if;

  insert into public.messages (match_id, application_id, sender_id, body)
  values (v_app.match_id, p_application_id, v_uid, v_body)
  returning * into v_row;

  insert into public.message_reads (application_id, user_id, last_read_at)
  values (p_application_id, v_uid, now())
  on conflict (application_id, user_id) do update set last_read_at = excluded.last_read_at;

  return v_row;
end;
$$;

grant execute on function public.send_message(uuid, text) to authenticated;

-- ============ marcar como leído y contar sin leer ============
create or replace function public.mark_thread_read(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_application_participant(p_application_id) then
    raise exception 'You are not part of this conversation.';
  end if;
  insert into public.message_reads (application_id, user_id, last_read_at)
  values (p_application_id, auth.uid(), now())
  on conflict (application_id, user_id) do update set last_read_at = excluded.last_read_at;
end;
$$;

create or replace function public.unread_message_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from public.messages m
  where m.application_id is not null
    and m.sender_id <> auth.uid()
    and public.is_application_participant(m.application_id)
    and m.created_at > coalesce(
      (select r.last_read_at from public.message_reads r
       where r.application_id = m.application_id and r.user_id = auth.uid()),
      'epoch'::timestamptz
    );
$$;

grant execute on function public.mark_thread_read(uuid) to authenticated;
grant execute on function public.unread_message_count() to authenticated;
