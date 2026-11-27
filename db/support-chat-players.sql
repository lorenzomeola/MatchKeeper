-- Amplía el chat con el equipo de MatchKeeper (db/support-chat.sql) a los jugadores, además de los porteros.
-- Se pega entero en el SQL Editor de Supabase. Idempotente: se puede correr varias veces.
-- Requiere haber corrido antes db/support-chat.sql. Las tablas y las políticas no cambian: la clave del hilo
-- (support_threads.keeper_id) es el id del perfil, sea portero o jugador.

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
    if not exists (select 1 from public.profiles where id = p_keeper_id and role in ('goalkeeper', 'player')) then
      raise exception 'User not found.';
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
