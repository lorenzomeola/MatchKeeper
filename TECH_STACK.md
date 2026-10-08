# MatchKeeper — Tech Stack

> Complementa a [PRODUCT_PLAN.md](./PRODUCT_PLAN.md). Elegido priorizando:
> reutilizar lo ya construido en la landing, minimizar el número de
> suscripciones pagas, y usar servicios "managed" para no reinventar
> auth/pagos/chat desde cero.

## 1. Resumen del stack

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js** (App Router) | Ya usado en la landing; fullstack en un repo (marketing + app); Server Components; integración de primera clase con Vercel/Stripe/Supabase |
| Lenguaje | TypeScript | Ya usado en el repo actual |
| Backend/DB | **Supabase** (Postgres + Auth + Realtime + Storage) | Un solo servicio cubre DB, login, chat y fotos de perfil — menos suscripciones que mantener |
| Autenticación | **Supabase Auth** | Incluido en Supabase, sin costo/servicio extra; soporta email+password y OAuth (Google) |
| Pagos | **Stripe** (Connect Express + Separate Charges and Transfers) | Ver `PAYMENTS_SPEC.md`. Sin cuota fija, solo % por transacción |
| Chat 1:1 | **Supabase Realtime** (canales Postgres) | Suficiente para chat simple del MVP, incluido en el mismo plan de Supabase |
| Mapa | **Mapbox** (fallback: MapLibre + OSM si el volumen crece) | 50k cargas/mes gratis, geocoding y estilos de mapa listos para usar |
| Hosting | **Vercel** | Mismo proveedor que la landing actual, deploy automático desde git |
| Estilos/UI | Tailwind CSS (ya usado en la landing) + shadcn/ui para componentes de app (formularios, tablas, modales) | Consistencia con la landing, componentes accesibles listos |
| Acceso a datos (runtime) | **`supabase-js`** (PostgREST) sobre HTTPS, no conexión directa a Postgres | Ver §1.1 — necesario por la VPN corporativa del founder |
| Esquema/migraciones | Drizzle Kit (`db/schema.ts` → SQL) | Solo para generar y versionar el SQL del esquema, no para queries en runtime |
| Jobs programados (confirmación auto de partido) | Vercel Cron (o `pg_cron` de Supabase) llamando una API route cada hora | No requiere infraestructura extra. **Construido** en `/api/cron/release` (libera pagos, reanuda cancelaciones, borra coordenadas). `vercel.json` la lanza una vez al día porque Hobby no permite más: para cada hora hace falta Vercel Pro |
| Email transaccional | Resend (recibos, notificaciones de aplicación/aceptación) | Buen free tier, integración simple con Next.js. **Todavía no está instalado**: no se envía ningún email |
| Analytics/errores | Vercel Analytics + Sentry (free tier) | Monitoreo básico sin costo al inicio |

### 1.1 Por qué no hay conexión directa a Postgres en runtime

El equipo de desarrollo trabaja desde un laptop corporativo con VPN
**GlobalProtect en modo "forced tunnel"**: todo el tráfico sale por la VPN de
la empresa sin importar la red física (WiFi de casa, hotspot, etc.), y esa
VPN bloquea el protocolo binario de Postgres (puertos 5432/6543) aunque deja
pasar HTTPS normal. Por eso:

- **Runtime (Next.js, dev y producción)**: todas las queries de la app pasan
  por `supabase-js` (cliente ya creado en `lib/supabase/{client,server}.ts`),
  que habla con Supabase por HTTPS (PostgREST) — funciona igual detrás de la
  VPN que en Vercel. Se usa el mismo código en local y en producción (una
  sola ruta de acceso a datos, sin bifurcaciones).
- **Drizzle** se mantiene solo como generador de esquema/migraciones
  (`db/schema.ts` + `npm run db:generate`, 100% local, no toca la red). El
  SQL generado se aplica pegándolo a mano en el **SQL Editor** de Supabase
  (funciona por HTTPS) en vez de con `drizzle-kit migrate`.
- **Seguridad**: como ya no hay una conexión de backend "de confianza total",
  las **políticas RLS de Postgres pasan a ser la capa de seguridad
  principal** — cada tabla necesita sus políticas explícitas antes de poder
  leer/escribir desde `supabase-js` (proyecto ya creado con "Enable automatic
  RLS", así que todo empieza bloqueado por defecto).
- Para operaciones que deben ser atómicas (ej. aceptar una aplicación →
  crear booking → marcar partido como asignado), se usan **funciones
  Postgres (RPC)** llamadas vía `supabase.rpc(...)` en vez de varias queries
  sueltas desde el cliente.
- Costo: **sin cambio** — el Data API/PostgREST viene incluido en el plan
  Supabase Pro ya presupuestado.

## 2. Costos estimados (piloto Londres)

| Servicio | Plan inicial | Costo/mes |
|---|---|---|
| Vercel | Pro (Hobby no permite uso comercial) | ~$20 |
| Supabase | Pro (Free se pausa tras inactividad) | ~$25 |
| Mapbox | Free tier (50k cargas/mes) | $0 |
| Stripe | Sin cuota fija | 1.5% + 20p (tarjeta británica estándar) a 3.15% + 20p (internacional) por cobro, más £2/mes por portero activo y 0.25% + 10p por cada pago a un portero. Detalle en `PAYMENTS_SPEC.md` |
| Resend | Free tier | $0 |
| Dominio | Anual, amortizado | ~$1-2 |
| **Total fijo** | | **~$45-50/mes** + % de Stripe sobre el volumen transaccionado |

Se puede arrancar en $0/mes con los planes Free (Vercel Hobby + Supabase Free)
durante pruebas internas, y subir a Pro justo antes de lanzar con pagos reales.

## 3. Comisión y ejemplo de márgenes

- **Comisión de MatchKeeper: 15%**, cobrada al jugador además de la tarifa
  que fija el portero (config, ajustable sin tocar el modelo de datos).
- El portero siempre recibe el 100% de su tarifa `X`; el jugador paga
  `X × 1.15`.

| Tarifa portero | Comisión (15%) | Total al jugador | Fee Stripe (~1.5%+£0.20) | Neto MatchKeeper |
|---|---|---|---|---|
| £30 | £4.50 | £34.50 | £0.72 | £3.78 |
| £50 | £7.50 | £57.50 | £1.06 | £6.44 |
| £80 | £12.00 | £92.00 | £1.58 | £10.42 |

(Tarifas verificadas el 2026-10-02 en stripe.com/gb/pricing. El "Neto" de la
tabla no incluye la comisión de Connect por pago al portero (0.25% + 10p) ni los
£2 mensuales por portero activo. Con la comisión de Connect, a £30 el neto de un
partido normal es £3.61. Detalle y casos en `PAYMENTS_SPEC.md`, sección 2.)

## 4. Modelo de datos (alto nivel)

- `users` (Supabase Auth) — 1:1 con `profiles` (rol: `player` | `goalkeeper`, ubicación base, foto, bio).
- `teams` — perfil opcional creado por un `player`; `team_members` (roster).
- `matches` — publicado por un `player` (o `team`): fecha, ubicación (lat/lng), duración, presupuesto sugerido, estado (`open` → `assigned` → `completed`/`cancelled`).
- `applications` — portero aplica a un `match` con su tarifa; estado (`pending`/`accepted`/`rejected`).
- `bookings` — se crea al elegir portero (`pending_payment`) y pasa a `confirmed` cuando Stripe confirma el cobro. Guarda importes en peniques, check-in, respuesta del equipo, ids de Stripe y la aceptación de los Términos (ver `PAYMENTS_SPEC.md`, secciones 4 y 9). Una sola reserva activa por partido.
- `booking_events` — registro de auditoría solo de inserción; base de la evidencia de disputas.
- `keeper_stripe_accounts` — cuenta Connect del portero, aparte de `profiles` porque `profiles` lo leen los equipos.
- `disputes` — disputas con el banco: evidencia preparada, culpa, recuperación y devolución si se gana.
- `keeper_debts` y `keeper_debt_deductions` — lo que un portero debe tras una disputa perdida por su culpa y lo descontado en cada pago.
- `stripe_events` — ids de eventos de Stripe ya procesados (idempotencia del webhook).
- `reviews` — jugador → portero, ligada a un `booking` completado.
- `messages` — chat 1:1 por candidatura (`application_id`), iniciado por el equipo; continúa tras aceptar.
- `strikes` — faltas del portero (`late_cancel` o `no_show`), con anulación por un admin. La suspensión se calcula a partir de los puntos, no se guarda.

## 5. Próximo paso

**Estado a 2026-10-06:** la Fase 1 y los pagos de la Fase 2 están construidos; los
pagos, strikes y disputas se probaron en el sandbox de Stripe (56 pruebas unitarias,
más ejecuciones reales contra Stripe y Supabase). El detalle está en
`PAYMENTS_SPEC.md` y en el "Status board" de `design-system/matchkeeper/MASTER.md`.

Lo que falta, por orden:
1. **Resend** con un dominio verificado: emails y recordatorios de pagos, strikes,
   revisiones y disputas.
2. Los webhooks de Stripe que faltan (estado de la cuenta del portero, reembolsos,
   transferencias revertidas, pagos fallidos) y Stripe Radar.
3. **Historial de pagos** (`/payments`) para el portero (ganado, retenido, cancelaciones,
   descuentos, CSV) y para el equipo (pagado, reembolsado, recibos); pedido el
   2026-10-06, ver `PAYMENTS_SPEC.md`, sección 12.1.
4. **Preparar el lanzamiento:** variables de entorno y webhook en Vercel, plan Pro de
   Vercel para el cron cada hora, Stripe en modo real, prueba del check-in en un
   móvil real, revisión legal y empresa constituida.
