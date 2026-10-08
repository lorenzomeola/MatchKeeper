-- Emails: permisos de la cola de envíos. Se pega entero en el SQL Editor de Supabase DESPUÉS de db/migrations/0013_*.sql.
-- Idempotente. La cola solo la lee y escribe el servidor con la clave de servicio (service_role se salta RLS).

grant all on all tables in schema public to service_role;

alter table public.email_outbox enable row level security;
revoke all on table public.email_outbox from anon, authenticated;
-- Sin políticas: ningún usuario (ni siquiera un admin desde el cliente) ve direcciones ni contenido de otros.
