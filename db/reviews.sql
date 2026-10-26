-- Reseñas: el jugador valora al portero cuando el partido ya terminó. Se pega entero en el SQL Editor de Supabase.
-- Idempotente. Sustituye la política de insert de policies.sql, que exigía un pago liberado (Stripe aún no existe).

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reviews_rating_check') then
    alter table public.reviews add constraint reviews_rating_check check (rating between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reviews_comment_len') then
    alter table public.reviews add constraint reviews_comment_len check (comment is null or char_length(comment) <= 600);
  end if;
end $$;

drop policy if exists "reviews_insert_reviewer_of_booking" on public.reviews;
create policy "reviews_insert_reviewer_of_booking"
on public.reviews for insert
to authenticated
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1
    from public.bookings b
    join public.matches m on m.id = b.match_id
    where b.id = reviews.booking_id
      and b.player_id = auth.uid()
      and b.goalkeeper_id = reviews.goalkeeper_id
      and (
        b.payment_status in ('held', 'released')
        or (b.payment_status = 'none' and b.status in ('confirmed', 'under_review', 'completed'))
      )
      and m.ends_at < now()
  )
);
