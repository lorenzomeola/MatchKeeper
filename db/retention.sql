-- Conservación de datos (Política de privacidad, sección 5). Se pega entero en el SQL Editor de Supabase. Idempotente.
--
-- Las coordenadas del check-in se borran a los 120 días del final del partido, que cubre el plazo de disputa con la tarjeta.
-- Se conservan la hora del check-in y la distancia al campo. Con una disputa abierta se esperan hasta que se resuelva.
-- Las ejecuta el cron diario (app/api/cron/release/route.ts).

create or replace function public.purge_checkin_coordinates()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with purged as (
    update public.bookings b
    set check_in_lat = null, check_in_lng = null
    from public.matches m
    where m.id = b.match_id
      and (b.check_in_lat is not null or b.check_in_lng is not null)
      and m.ends_at < now() - interval '120 days'
      and not exists (
        select 1 from public.disputes d
        where d.booking_id = b.id
          and d.status in ('needs_response', 'warning_needs_response', 'under_review', 'warning_under_review')
      )
    returning b.id
  )
  select count(*) into v_count from purged;
  return v_count;
end;
$$;

revoke execute on function public.purge_checkin_coordinates() from public, anon, authenticated;
grant execute on function public.purge_checkin_coordinates() to service_role;
