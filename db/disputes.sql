-- Disputas: permisos de las tablas nuevas y descuento de deudas de porteros. Se pega entero en el SQL Editor de Supabase
-- DESPUÉS de db/migrations/0011_*.sql. Idempotente.

grant all on all tables in schema public to service_role;

-- ============ keeper_debts: el portero ve las suyas, los admins todas. Solo escribe el servidor ============
alter table public.keeper_debts enable row level security;
revoke all on table public.keeper_debts from anon, authenticated;
grant select on table public.keeper_debts to authenticated;

drop policy if exists "keeper_debts_select_own_or_admin" on public.keeper_debts;
create policy "keeper_debts_select_own_or_admin"
on public.keeper_debts for select
to authenticated
using (goalkeeper_id = auth.uid() or public.is_admin());

alter table public.keeper_debt_deductions enable row level security;
revoke all on table public.keeper_debt_deductions from anon, authenticated;
grant select on table public.keeper_debt_deductions to authenticated;

drop policy if exists "keeper_debt_deductions_select_admin" on public.keeper_debt_deductions;
create policy "keeper_debt_deductions_select_admin"
on public.keeper_debt_deductions for select
to authenticated
using (public.is_admin());

-- ============ Descuento de deuda en un pago al portero ============
-- Reserva cuánto de este pago se queda MatchKeeper para saldar deudas abiertas del portero (las más antiguas primero).
-- Idempotente por reserva: si ya se reservó para esta reserva, devuelve lo mismo sin descontar otra vez.
create or replace function public.reserve_debt_deduction(p_booking uuid, p_keeper uuid, p_max integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  d record;
  v_left integer := greatest(p_max, 0);
  v_take integer;
  v_total integer := 0;
begin
  if exists (select 1 from public.keeper_debt_deductions where booking_id = p_booking) then
    return (select coalesce(sum(amount_pence), 0) from public.keeper_debt_deductions where booking_id = p_booking);
  end if;

  for d in
    select id, dispute_id, amount_pence, recovered_pence
    from public.keeper_debts
    where goalkeeper_id = p_keeper and status = 'open'
    order by created_at
    for update
  loop
    exit when v_left <= 0;
    v_take := least(d.amount_pence - d.recovered_pence, v_left);
    if v_take <= 0 then
      continue;
    end if;

    insert into public.keeper_debt_deductions (debt_id, booking_id, amount_pence) values (d.id, p_booking, v_take);

    update public.keeper_debts
    set recovered_pence = recovered_pence + v_take,
        status = case when recovered_pence + v_take >= amount_pence then 'settled' else status end,
        settled_at = case when recovered_pence + v_take >= amount_pence then now() else settled_at end
    where id = d.id;

    if d.amount_pence - d.recovered_pence - v_take <= 0 and d.dispute_id is not null then
      update public.disputes set recovered_at = coalesce(recovered_at, now()) where id = d.dispute_id;
    end if;

    v_left := v_left - v_take;
    v_total := v_total + v_take;
  end loop;

  return v_total;
end;
$$;

revoke execute on function public.reserve_debt_deduction(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_debt_deduction(uuid, uuid, integer) to service_role;
