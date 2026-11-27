-- Cancelar un partido abierto propio (sin portero reservado): lo usa "cancelar el anterior y publicar el nuevo".
-- Se pega entero en el SQL Editor de Supabase. Idempotente.
-- Si ya hay un portero reservado el partido no es cancelable por aquí: eso va por cancel_booking.

create or replace function public.cancel_open_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches%rowtype;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found or m.created_by is distinct from auth.uid() then
    raise exception 'Match not found';
  end if;
  if m.status <> 'open' then
    raise exception 'Only open matches can be cancelled here';
  end if;
  if exists (select 1 from public.bookings where match_id = m.id and status <> 'cancelled') then
    raise exception 'This match already has a booked keeper';
  end if;

  update public.matches set status = 'cancelled' where id = m.id;
  update public.applications set status = 'rejected' where match_id = m.id and status = 'pending';
end;
$$;

revoke execute on function public.cancel_open_match(uuid) from public, anon;
grant execute on function public.cancel_open_match(uuid) to authenticated;
