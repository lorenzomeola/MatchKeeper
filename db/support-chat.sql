-- Chat entre el equipo de MatchKeeper (un buzón compartido por todos los admins) y cada portero,
-- antes y después de aprobarlo, y la preferencia del resumen semanal de partidos abiertos.
-- Se pega entero en el SQL Editor de Supabase. Idempotente: se puede correr varias veces.
-- Requiere haber corrido antes db/policies.sql, db/messaging.sql y db/admin.sql.

-- ============ preferencia del resumen semanal ============
alter table public.profiles add column if not exists match_digest boolean not null default true;
grant update (match_digest) on table public.profiles to authenticated;

-- ============ esquema ============
create table if not exists public.support_threads (
  keeper_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  keeper_read_at timestamptz,
  -- Buzón compartido: una sola marca de lectura para todos los admins.
  admin_read_at timestamptz
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  keeper_id uuid not null references public.support_threads(keeper_id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  from_admin boolean not null,
  body text not null constraint support_messages_body_chk check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists support_messages_keeper_created_idx on public.support_messages (keeper_id, created_at);
create index if not exists support_threads_last_message_idx on public.support_threads (last_message_at desc);

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

-- El cliente solo lee; se escribe siempre por las funciones de abajo.
revoke all on table public.support_threads from anon, authenticated;
revoke all on table public.support_messages from anon, authenticated;
grant select on table public.support_threads to authenticated;
grant select on table public.support_messages to authenticated;

drop policy if exists "support_threads_select_keeper_or_admin" on public.support_threads;
create policy "support_threads_select_keeper_or_admin"
on public.support_threads for select
to authenticated
using (keeper_id = auth.uid() or public.is_admin());

drop policy if exists "support_messages_select_keeper_or_admin" on public.support_messages;
create policy "support_messages_select_keeper_or_admin"
on public.support_messages for select
to authenticated
using (keeper_id = auth.uid() or public.is_admin());

-- ============ Realtime ============
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_messages'
  ) then
    alter publication supabase_realtime add table public.support_messages;
  end if;
end $$;

-- ============ enviar mensaje ============
-- Un admin puede escribir a cualquier portero (abre el hilo si no existe); el portero solo contesta.
create or replace function public.send_support_message(p_keeper_id uuid, p_body text)
returns public.support_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_row public.support_messages;
begin
  if v_uid is null then
    raise exception 'Log in to send messages.';
  end if;
  if v_body = '' then
    raise exception 'Write a message first.';
  end if;
  if char_length(v_body) > 1000 then
    raise exception 'Messages are limited to 1000 characters.';
  end if;

  if v_uid = p_keeper_id then
    if not exists (select 1 from public.support_threads where keeper_id = p_keeper_id) then
      raise exception 'The MatchKeeper team needs to message you first.';
    end if;
    if (
      select count(*) from public.support_messages
      where sender_id = v_uid and created_at > now() - interval '1 minute'
    ) >= 10 then
      raise exception 'You are sending messages too fast. Wait a moment and try again.';
    end if;
    update public.support_threads
    set last_message_at = now(), keeper_read_at = now()
    where keeper_id = p_keeper_id;
  elsif public.is_admin() then
    if not exists (select 1 from public.profiles where id = p_keeper_id and role = 'goalkeeper') then
      raise exception 'Keeper not found.';
    end if;
    insert into public.support_threads (keeper_id, last_message_at, admin_read_at)
    values (p_keeper_id, now(), now())
    on conflict (keeper_id) do update set last_message_at = excluded.last_message_at, admin_read_at = excluded.admin_read_at;
  else
    raise exception 'You are not part of this conversation.';
  end if;

  insert into public.support_messages (keeper_id, sender_id, from_admin, body)
  values (p_keeper_id, v_uid, v_uid <> p_keeper_id, v_body)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.send_support_message(uuid, text) to authenticated;

-- ============ marcar como leído y contar sin leer ============
create or replace function public.mark_support_read(p_keeper_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = p_keeper_id then
    update public.support_threads set keeper_read_at = now() where keeper_id = p_keeper_id;
  elsif public.is_admin() then
    update public.support_threads set admin_read_at = now() where keeper_id = p_keeper_id;
  else
    raise exception 'You are not part of this conversation.';
  end if;
end;
$$;

-- Mensajes del equipo de MatchKeeper que el portero aún no ha leído.
create or replace function public.support_unread_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from public.support_messages m
  join public.support_threads t on t.keeper_id = m.keeper_id
  where m.keeper_id = auth.uid()
    and m.from_admin
    and m.created_at > coalesce(t.keeper_read_at, '-infinity'::timestamptz);
$$;

-- Conversaciones con respuestas de porteros que ningún admin ha leído (0 si no eres admin).
create or replace function public.support_inbox_unread_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select case when not public.is_admin() then 0 else (
    select count(*)::int
    from public.support_threads t
    where exists (
      select 1 from public.support_messages m
      where m.keeper_id = t.keeper_id
        and not m.from_admin
        and m.created_at > coalesce(t.admin_read_at, '-infinity'::timestamptz)
    )
  ) end;
$$;

grant execute on function public.mark_support_read(uuid) to authenticated;
grant execute on function public.support_unread_count() to authenticated;
grant execute on function public.support_inbox_unread_count() to authenticated;
