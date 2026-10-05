-- Perfil público del portero: estadísticas agregadas. Se pega entero en el SQL Editor de Supabase.
-- Idempotente. Usa is_admin (policies.sql) y shares_match_with (dashboards.sql), que ya existen.
-- Solo las ve el propio portero, un admin o quien tenga una aplicación suya en uno de sus partidos.

create or replace function public.keeper_public_stats(p_keeper uuid)
returns table (games_played integer, avg_rate numeric, review_count integer, avg_rating numeric)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*)::int
       from public.bookings b
       join public.matches m on m.id = b.match_id
      where b.goalkeeper_id = p_keeper
        and b.payment_status <> 'refunded'
        and m.ends_at < now()),
    (select round(avg(b.rate), 2)
       from public.bookings b
      where b.goalkeeper_id = p_keeper and b.payment_status <> 'refunded'),
    (select count(*)::int from public.reviews r where r.goalkeeper_id = p_keeper),
    (select round(avg(r.rating), 1) from public.reviews r where r.goalkeeper_id = p_keeper)
  where p_keeper = auth.uid() or public.is_admin() or public.shares_match_with(p_keeper);
$$;

grant execute on function public.keeper_public_stats(uuid) to authenticated;
