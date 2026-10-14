-- Interruptor de versión: beta gratis por defecto; solo el valor explícito `true` activa pagos.
-- Ejecutar una vez en cada proyecto, antes de db/booking-payments.sql y db/free-beta.sql.

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
revoke all on table public.app_settings from anon, authenticated;
grant all on table public.app_settings to service_role;

-- En una base nueva empieza en beta gratis. No sobrescribe una decisión existente.
insert into public.app_settings (key, value) values ('payments_enabled', 'false')
on conflict (key) do nothing;

create or replace function public.payment_mode()
returns text
language sql
security definer
set search_path = public
stable
as $$
  with setting as (
    select value from public.app_settings where key = 'payments_enabled'
  )
  select case
    when not exists (select 1 from setting) then 'free'
    when (select value from setting) = 'false' then 'free'
    when (select value from setting) = 'true' then 'paid'
    else 'unavailable'
  end;
$$;

revoke execute on function public.payment_mode() from public, anon;
grant execute on function public.payment_mode() to authenticated, service_role;

-- Compatibilidad para consumidores que solo necesitan saber si Stripe está activo.
-- `unavailable` no se convierte en `true`.
create or replace function public.payments_enabled()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.payment_mode() = 'paid';
$$;

grant execute on function public.payments_enabled() to anon, authenticated, service_role;
