# MatchKeeper: especificación de pagos, check-in y disputas

Documento listo para implementar. Recoge todo lo decidido sobre cómo se cobra,
cómo se retiene y se libera el dinero, cómo funcionan las cancelaciones, el
check-in del portero y las disputas. Si este documento y otro difieren en estos
temas, **este documento manda**.

## 0. Estado y cuándo se implementa

- **Decidido el 2026-10-02.** Las cifras de Stripe se verificaron ese día en su
  documentación oficial (ver sección 18).
- **Construido y probado en el sandbox de Stripe el 2026-10-06** (pasos 1 a 8 de la
  sección 17, más strikes, borrado de coordenadas y solapamiento de calendario).
  Estado por sección, abajo y en las secciones 10, 11, 12, 15, 16 y 17.
  **Pendiente:** emails y recordatorios (Resend),
  herramientas de admin menores (sección 12) y todo lo de lanzamiento (sección 17,
  paso 10). El historial de pagos (sección 12.1) está hecho; falta el recibo de Stripe
  del equipo. No se ha probado nada con
  dinero real ni en Vercel.
- Las pruebas fueron contra el sandbox con tarjetas de prueba, en local con la CLI de
  Stripe reenviando webhooks. Cada paso se probó antes de pasar al siguiente: pruebas
  unitarias de las reglas, ejecución real contra Stripe y la base de datos, y los
  caminos de error y de permisos. Lo que **no** se pudo probar está anotado en la
  sección 18.
- La copy ([FAQ](components/platform/faq.tsx), [Terms](app/(legal)/terms/page.tsx) y
  [Safety](app/(legal)/safety/page.tsx)) describe estas reglas y se mantiene alineada
  con lo construido (strikes y recuperación en disputas actualizados el 2026-10-06).
- **Antes de lanzar con pagos reales:** revisión de Términos por un abogado
  (sección 14) y empresa constituida con cuenta de Stripe verificada.
- El sistema de diseño de las pantallas nuevas está en
  [design-system/matchkeeper/MASTER.md](design-system/matchkeeper/MASTER.md).
- **Orden para montar una base de datos desde cero:** las migraciones `0007` a `0011`
  de `db/migrations/` (pegadas en el SQL Editor de Supabase), y después
  `db/strikes.sql`, `db/payments.sql`, `db/booking-payments.sql`,
  `db/cancellations.sql`, `db/disputes.sql` y `db/retention.sql`. Todos son
  idempotentes. `db/payments.sql` y `db/booking-payments.sql` no se pueden pasar antes
  que `db/strikes.sql`, porque usan `keeper_is_suspended`.

## 1. Decisiones cerradas

| Tema | Decisión |
|---|---|
| Comisión | 15% sobre la tarifa del portero, cobrada al equipo además de la tarifa |
| Lo que cobra el portero | El 100% de su tarifa. Nunca menos de su parte |
| Tarifa | La fija el portero en cada candidatura. No existe tarifa de plataforma |
| Cuándo se cobra al equipo | Al elegir al portero (no hay segunda aceptación del portero) |
| Retención | El dinero queda en el saldo de la plataforma hasta liberarlo |
| Equipo cancela con más de 24 h | Gratis, reembolso total |
| Equipo cancela entre 24 h y 2 h | Se cobra el 50%, se reembolsa el otro 50% |
| Equipo cancela con menos de 2 h, o no aparece | Se cobra el 100% y el portero cobra completo |
| Antes de que haya un portero elegido | Retirarse es gratis |
| Portero cancela con más de 24 h | Sin penalización, reembolso total al equipo |
| Portero cancela más tarde o no aparece | Reembolso total al equipo y un strike |
| Strikes repetidos | Sistema por puntos en una ventana móvil: no-show = 3 puntos durante 12 meses, cancelación tardía = 1 punto durante 90 días. 1 punto: aviso. 2 puntos: el admin revisa. 3 o más: suspendido, no puede aplicar a partidos nuevos (sus reservas ya confirmadas siguen). Dos no-shows en 12 meses marcan al portero como candidato a retirada definitiva, que decide siempre una persona. Un admin puede anular un strike con un motivo. Decidido y construido el 2026-10-06 (`lib/strikes.ts`, `db/strikes.sql`, `/admin/strikes`) |
| Después del partido | 3 días para que el equipo confirme o reporte |
| Liberación automática | A los 3 días, **solo si el portero hizo check-in** |
| Sin check-in y equipo en silencio | No se libera. Se retiene y se contacta a ambos |
| Check-in | Botón "I have arrived" con hora y ubicación, cerca del campo y en una ventana alrededor del inicio |
| Lluvia o campo cerrado | Sin regla especial. Aplica el calendario normal. Si el recinto cierra el campo, caso por caso por email. Revisar la regla si ocurre a menudo |
| Quién asume una disputa perdida | Ver sección 8 |
| Formatos y superficies | Cubre todos (5, 7, 9, 11, futsal, hierba, artificial, interior, exterior) |

## 2. Modelo económico

Sea `X` la tarifa del portero en peniques. Todo se calcula en **enteros de
peniques**, en el servidor, nunca con decimales ni con importes que envíe el
cliente.

```
platformFeePence = round(X * commissionPct / 100)      # commissionPct = 15
totalPence       = X + platformFeePence                 # lo que paga el equipo
```

Cobro parcial (cancelación tardía del equipo), con `chargePct` = 50 o 100:

```
keeperSharePence = round(X * chargePct / 100)
feeSharePence    = round(keeperSharePence * commissionPct / 100)
chargedPence     = keeperSharePence + feeSharePence
refundPence      = totalPence - chargedPence
```

La comisión se aplica siempre a la parte de la tarifa que se paga, así que
MatchKeeper cobra algo también en cancelaciones tardías.

Ejemplo con `X` = 3000 (30 libras), `totalPence` = 3450:

| Caso | chargePct | Equipo paga | Portero cobra | MatchKeeper |
|---|---|---|---|---|
| Partido jugado | 100 | 3450 | 3000 | 450 |
| Equipo cancela entre 24 h y 2 h | 50 | 1725 | 1500 | 225 |
| Equipo cancela con menos de 2 h | 100 | 3450 | 3000 | 450 |
| Equipo cancela con más de 24 h | 0 | 0 | 0 | 0 |

### Neto por caso, tarifa de 30 libras, tarjeta británica estándar

Costes: comisión de tarjeta 1.5% + 20p sobre el total cobrado (0.72 libras) y
comisión de Connect por pago al portero 0.25% + 10p sobre lo que cobra el
portero. Excluye los 2 libras mensuales por portero activo y el IVA.

| Caso | Equipo paga | Portero cobra | Comisión | Costes Stripe | Neto |
|---|---|---|---|---|---|
| Partido jugado, confirmado o liberado solo | 34.50 | 30.00 | 4.50 | 0.72 + 0.18 | **+3.61** |
| Nadie acepta, o el equipo retira antes | 0 | 0 | 0 | 0 | 0 |
| Equipo cancela con más de 24 h | 0 | 0 | 0 | 0.72 | **-0.72** |
| Equipo cancela entre 24 h y 2 h (50%) | 17.25 | 15.00 | 2.25 | 0.72 + 0.14 | **+1.40** |
| Equipo cancela con menos de 2 h o no aparece (100%) | 34.50 | 30.00 | 4.50 | 0.72 + 0.18 | **+3.61** |
| Portero cancela con más de 24 h | 0 | 0 | 0 | 0.72 | **-0.72** |
| Portero cancela tarde o no aparece | 0 | 0 | 0 | 0.72 | **-0.72** |
| Contracargo perdido | 0 | ver sección 8 | 0 | 20 a 50 más comisiones | **-20.7 a -50.7** sin responder, **-40.7 a -70.7** si respondes y pierdes |

### Sensibilidad

Partido normal, tarjeta británica estándar:

| Tarifa | Comisión | Neto | Pérdida por cancelación gratuita |
|---|---|---|---|
| 20 | 3.00 | 2.31 | -0.55 |
| 30 | 4.50 | 3.61 | -0.72 |
| 50 | 7.50 | 6.21 | -1.06 |
| 80 | 12.00 | 10.12 | -1.58 |

Con tarifa de 30 libras, el neto de un partido normal según la tarjeta del
equipo: británica estándar 3.61, británica premium 3.16, EEA 3.26,
internacional 3.04.

Dos consecuencias prácticas:
- Un portero que juega **un solo partido al mes** se come más de la mitad del
  margen por los 2 libras mensuales (3.61 - 2.00 = 1.61). Con cuatro partidos al
  mes baja a 0.50 por partido.
- **Un contracargo cuesta lo que 5 o 6 partidos normales de margen.**

## 3. Arquitectura Stripe

- **Stripe Connect** con **separate charges and transfers** (Stripe lo llama
  cargo indirecto). El cargo entra en la cuenta de MatchKeeper y, tras la
  liberación, se hace una `Transfer` a la cuenta del portero por su tarifa.
- **No usar `application_fee_amount`.** Ese parámetro es de cargos directos y de
  destino. Aquí la comisión es simplemente lo que MatchKeeper no transfiere.
- **Cobrar al elegir al portero**, con captura inmediata. No usar retención de
  tarjeta (autorización sin captura): caduca a los 7 días aproximadamente y una
  reserva puede hacerse con semanas de antelación, además de que hay que retener
  3 días tras el partido.
- **Cuentas de portero:** panel Express, la plataforma asume los saldos negativos
  y las comisiones de Stripe. Stripe recomienda "plataforma responsable" para
  marketplaces que cobran al cliente y pagan al vendedor.
- **Decisión irreversible:** el tipo de panel de una cuenta conectada es
  permanente. Cambiarlo obliga a crear una cuenta nueva y volver a dar de alta al
  portero. **Decidir la configuración antes de crear la primera cuenta
  conectada.**
- Las plataformas nuevas usan la **API Accounts v2**, donde estas opciones son
  propiedades de la cuenta. Comprobar los nombres exactos en la documentación.
- Un portero **no puede ser elegido** hasta que su cuenta tenga cobros y pagos
  habilitados (webhook `account.updated`). Esto es lo que hace verdadera la frase
  "Identity confirmed" de la web y de Safety: la verificación de identidad la hace
  Stripe en el alta de la cuenta Connect. Si un portero pudiera ser elegido sin
  completar ese alta, la frase sería falsa y habría que quitarla.
- Moneda: GBP. Mercado: Reino Unido.

### Parámetros del cobro

- `statement_descriptor`: `MATCHKEEPER` (el límite de Stripe es de 22 caracteres).
- `receipt_email` y recibo con fecha, campo y nombre del portero.
- `transfer_group` y `metadata.booking_id` en cada cargo, transferencia y reembolso.
- 3D Secure activado en todos los pagos (la autenticación es obligatoria en la
  mayoría de pagos británicos; si el pago está autenticado, la responsabilidad
  por fraude pasa al banco emisor).
- **Claves de idempotencia** en todas las llamadas de escritura a Stripe:
  `charge:{bookingId}`, `release:{bookingId}`, `refund:{bookingId}:{n}`.

## 4. Ciclo de vida de una reserva

Estados propuestos para `bookings.status` (el estado del dinero va aparte en
`payment_status`):

| Estado | Significado |
|---|---|
| `pending_payment` | El equipo eligió portero y el checkout está abierto. Caduca a los 30 minutos y la candidatura vuelve a estar disponible |
| `confirmed` | Pagado, esperando al partido |
| `under_review` | Necesita decisión de un admin |
| `completed` | Liberado al portero |
| `cancelled` | Cancelado. `cancelled_by` y `cancellation_charge_pct` dicen cómo |

Estados del dinero (`payment_status`; el enum actual tiene `held`, `released`,
`refunded`, `failed`; hay que añadir `pending` (antes de pagar), `partially_refunded`
y `disputed` con `ALTER TYPE ... ADD VALUE`):

`pending` -> `held` -> `released` | `refunded` | `partially_refunded` | `disputed`.
`failed` si el pago no se completa.

Flujo:

```
match open
  -> equipo elige portero (candidatura accepted, las demás rejected)
  -> booking pending_payment + checkout (3D Secure, casilla de Términos)
  -> webhook payment_intent.succeeded
  -> booking confirmed, payment held, match assigned
  -> [dia del partido] check-in del portero
  -> [tras endsAt] recordatorios al equipo, equipo confirma o reporta
  -> job de liberación segun sección 7
  -> booking completed, payment released, match completed
```

Cancelaciones, reportes y revisión salen de `confirmed` hacia `cancelled` o
`under_review`.

### Cambios necesarios en lo que ya existe

La función `accept_application` de [db/policies.sql](db/policies.sql) hoy, al
aceptar una candidatura, la marca `accepted`, **rechaza las demás candidaturas
pendientes**, pone el partido en `assigned` y crea el booking (con `payment_status`
por defecto `held`), todo sin que nadie haya pagado. Con pagos hay que cambiarla:

- Crear el booking en `pending_payment` y con `payment_status = pending`. Hoy el
  valor por defecto `held` afirmaría que hay dinero retenido cuando no lo hay.
- **No rechazar las demás candidaturas ni pasar el partido a `assigned` hasta que
  el webhook confirme el pago.** Si el pago falla o caduca, las candidaturas
  vuelven a estar disponibles. Esto contradice el comportamiento actual.
- Mantener `SECURITY DEFINER`, la comprobación de que el usuario es el creador del
  partido y la restricción de un booking por partido (`match_id` es único).
- Guardar `terms_version` y `terms_accepted_at` al aceptar.
- Rechazar candidaturas de porteros sin cuenta Connect habilitada.

Las columnas `commission_pct` (ahora 15.00 por defecto) y `confirmed_at` ya
existen en `bookings`. La primera debe congelar el porcentaje vigente en el
momento de reservar. La segunda se reutiliza o se sustituye (sección 9).

## 5. Reglas de cancelación

`hoursBeforeStart` se calcula con marcas de tiempo `timestamptz` en UTC. La
conversión a hora de Londres es solo de presentación, así que el cambio de hora
no afecta a las reglas.

**Equipo cancela:**

| Condición | chargePct |
|---|---|
| `hoursBeforeStart > 24` | 0 |
| `2 < hoursBeforeStart <= 24` | 50 |
| `hoursBeforeStart <= 2` (incluye después del inicio) | 100 |

**Portero cancela:**

| Condición | Equipo | Portero |
|---|---|---|
| `hoursBeforeStart > 24` | Reembolso total | Sin penalización |
| `hoursBeforeStart <= 24` | Reembolso total | Strike |
| No aparece (sin check-in y reportado) | Reembolso total | Strike |

Implementar como **función pura** `cancellationOutcome(ratePence,
commissionPct, actor, hoursBeforeStart)` que devuelve `{ chargePct,
refundPence, keeperSharePence, feeSharePence, strike }`, con tests unitarios
(sección 15). Recibe `now` como parámetro para poder probar con fechas fijas.

El reembolso a la tarjeta tarda varios días en aparecer. Informarlo en el email.

## 6. Check-in del portero

- Botón "I have arrived" en el dashboard del portero y en la ficha del partido.
- Se registra: `keeper_checked_in_at`, latitud, longitud y distancia al punto
  del partido (`matches.lat`, `matches.lng`).
- **Solo se permite** dentro de una ventana (propuesta: de 30 minutos antes a 30
  minutos después del inicio) y a menos de una distancia máxima del campo
  (propuesta: 200 metros; ver sección 16).
- Un check-in no se puede deshacer. Si el portero está en el campo pero la
  ubicación falla, puede pedir ayuda a soporte y un admin lo marca a mano, con
  nota en el registro de eventos.
- La ubicación se puede falsear: es una prueba fuerte pero no concluyente. Su
  valor está en combinarla con la confirmación del equipo.
- Privacidad: la ubicación es dato personal (sección 13).

## 7. Confirmación y liberación

El equipo puede confirmar o reportar desde `startsAt` hasta `auto_release_at`
(`endsAt` + 3 días). Recordatorios: al terminar el partido y a las 24 horas.

| Check-in del portero | Respuesta del equipo | Resultado |
|---|---|---|
| Sí | Confirma | Se libera ya |
| Sí | Silencio durante 3 días | Se libera automáticamente |
| Sí | Reporta que no llegó | `under_review`. El check-in con ubicación es la prueba |
| No | Confirma que llegó | Se libera |
| No | Silencio durante 3 días | **No se libera.** `under_review`, se contacta a ambos |
| No | Reporta que no llegó | Reembolso total y strike |

Un portero que sí fue pero olvidó el botón puede reclamarlo, y el equipo puede
confirmar en cualquier momento.

**Job de liberación** (cada hora): selecciona reservas `confirmed` con
`payment_status = held` y `auto_release_at <= now`.
- Con check-in y sin respuesta del equipo: crea la `Transfer` (clave de
  idempotencia `release:{bookingId}`), marca `released`, `completed` y
  `released_at`, cuenta el partido para el portero y abre la reseña.
- Sin check-in y sin respuesta: pasa a `under_review` **una sola vez** y avisa.

Si el equipo reporta algo, el job **no** libera: la reserva queda en
`under_review` hasta que un admin decida.

## 8. Disputas y contracargos

Un contracargo es una reclamación del equipo a su banco. El banco devuelve el
dinero de inmediato y lo descuenta de la plataforma, y Stripe cobra 20 libras
por disputa (otras 20 si respondes; se devuelven si ganas). Reembolsar de forma
voluntaria una queja dudosa cuesta unas 0.72 libras, mucho menos.

**Quién asume una disputa perdida (decidido):**

| Motivo | Quién lo asume |
|---|---|
| El portero no se presentó, se fue antes o no cumplió | **El portero**, recuperado de sus pagos |
| Fraude con tarjeta robada | **MatchKeeper** |
| El equipo jugó y disputa de mala fe | **MatchKeeper**, y se veta al equipo |
| "No reconozco el cargo" | **MatchKeeper** |
| Queja de calidad poco clara | Caso por caso |

Cobrar a un portero que cumplió de buena fe sería injusto y podría
considerarse un término abusivo.

**Cómo se recupera dinero de un portero:** Stripe permite revertir una
transferencia ya enviada (`POST /v1/transfers/:id/reversals`, total o parcial,
verificado el 2026-10-06), pero la documentación dice que en transferencias de este
tipo solo se puede si la cuenta del portero tiene saldo para cubrirla. El débito
automático de saldos negativos funciona con bancos del Reino Unido, pero no se ha
probado en real. Por eso la recuperación tiene dos pasos (ver "Lo construido" abajo):
revertir la transferencia y, si Stripe no puede, una deuda del portero que se
descuenta de sus pagos futuros.

**Prevención** (todo se construye junto con los pagos):

1. Descriptor `MATCHKEEPER` y recibo por email con fecha, campo y portero.
2. 3D Secure en todos los pagos.
3. Stripe Radar. Empezar con la versión básica incluida; la ampliada cuesta
   desde 0.04 libras por pago revisado o desde 8 libras al mes, solo si aparece
   fraude.
4. Casilla de Términos al reservar, mostrando la tabla de cancelaciones antes de
   cobrar. Guardar `terms_version` y `terms_accepted_at`.
5. **Registro de eventos** por reserva (sección 9) y función
   `buildDisputeEvidence(bookingId)` que reúna: aceptación de Términos, chat,
   check-in, confirmación del equipo, marcas de tiempo y perfil del portero, en
   un formato listo para enviar a Stripe.
6. Reportar fácil: ruta clara dentro de los 3 días y respuesta en menos de un día.
7. Controles para cuentas nuevas: email verificado y, opcionalmente, límite en la
   primera reserva o en reservas de última hora.
8. Vigilar el ratio de disputas. Las redes de tarjetas empiezan a preocuparse
   alrededor del 1%, y con pocas reservas una sola disputa mueve mucho el porcentaje.
9. Responder a una disputa solo cuando la prueba sea buena: perder tras responder
   cuesta 20 libras más.

Las disputas pueden llegar meses después del pago (normalmente hasta 120 días),
cuando el portero ya cobró. De ahí la importancia de la cláusula de Términos y de
la configuración de cuenta de la sección 3.

### Lo construido (2026-10-06)

Decisiones tomadas al implementarlo:

- **Pagos al portero: diarios.** No se retrasan para dejar saldo recuperable: perjudica
  al portero y no cubre los 120 días de plazo.
- **Evidencia: la prepara el sistema, la envía un admin.** Al llegar la disputa se
  genera y se guarda (`disputes.evidence`): Términos aceptados, pago con 3D Secure,
  check-in, confirmación del equipo, chat, línea de tiempo y política de cancelación,
  más un resumen de cuánta prueba hay. Un admin la revisa y la envía con un botón,
  una sola vez, o acepta la disputa sin responder (responder y perder cuesta otras 20
  libras).
- **Quién asume la pérdida:** el admin marca portero, MatchKeeper o poco claro en
  `/admin/disputes`. Si es el portero se recupera **lo que MatchKeeper le pagó por
  esa reserva** (por ejemplo £30), no el total de la disputa. La comisión y las tasas
  de Stripe las asume la plataforma.
- **Recuperación en dos pasos:** primero se intenta revertir la transferencia. Si
  Stripe no puede, se crea una deuda (`keeper_debts`) que se descuenta de los pagos
  siguientes del portero, lo más antiguo primero (`reserve_debt_deduction`,
  idempotente por reserva). Un pago puede quedar en cero: se marca como liberado sin
  transferencia. El portero ve lo que debe en su inicio y un admin puede cancelar la
  deuda con un motivo.
- **Disputa ganada:** la reserva recupera su estado de pago anterior, se devuelve al
  portero lo revertido y lo ya descontado de otros pagos, y se cancelan las deudas de
  esa disputa.
- **Una vez iniciada la recuperación no se puede cambiar la decisión de culpa.**
- **Disputas sin reserva conocida:** se registran igualmente. El sistema busca la
  reserva por el cargo y, si falta, por la intención de pago.
- Eventos gestionados: `charge.dispute.created`, `updated`, `closed`,
  `funds_withdrawn` y `funds_reinstated`. Pueden llegar casi a la vez y en cualquier
  orden; el sistema lo tolera.
- Panel con el ratio de disputas de los últimos 90 días.

Limitaciones conocidas: la reversión **no falla de forma natural en el sandbox** (Stripe
de prueba deja revertir aunque la cuenta del portero tenga saldo cero), así que la ruta
de deuda se probó forzando el fallo y no se sabe cuándo fallará Stripe real. Si el
portero ya no tiene pagos futuros, la deuda queda sin cobrar y la asume la plataforma.
Si la reserva se liberó con el pago en cero (sin transferencia) no hay nada que
revertir.

## 9. Esquema de datos propuesto

Los nombres siguen el estilo de [db/schema.ts](db/schema.ts). Generar migraciones
con `npm run db:generate` y aplicarlas como se hizo con la 0002 (en el entorno de
Volvo, el pooler de Supabase no responde: pegar el SQL en el SQL Editor).

**`bookings` (columnas nuevas):**
- `status` (enum de la sección 4), `cancelled_at`, `cancelled_by`
  (`team`/`keeper`/`system`/`admin`), `cancellation_charge_pct`.
- Importes en peniques: `rate_pence`, `platform_fee_pence`, `total_pence`,
  `keeper_payout_pence`. El `rate` numérico actual se conserva para mostrar.
- `keeper_checked_in_at`, `check_in_lat`, `check_in_lng`, `check_in_distance_m`.
- `team_response` (`confirmed`/`reported_no_show`/`reported_other`),
  `team_responded_at`, `team_report_note`.
- `auto_release_at`, `released_at`.
- `stripe_charge_id`, `stripe_transfer_id`, `stripe_refund_id`
  (`stripe_payment_intent_id` ya existe).
- `terms_version`, `terms_accepted_at`.
- `confirmed_at` ya existe: reutilizarla como `team_responded_at` o eliminarla al
  migrar. Decidirlo al escribir la migración.

**`profiles` (portero):** `stripe_account_id` (único), `payouts_enabled`
(booleano), `stripe_onboarding_complete`.

**`booking_events`** (registro de auditoría, solo se inserta, nunca se edita):
`id`, `booking_id`, `type`, `actor_id` (o nulo si es el sistema), `data jsonb`,
`created_at`. Tipos: `payment_succeeded`, `keeper_checked_in`, `team_confirmed`,
`team_reported`, `released`, `cancelled`, `refunded`, `strike_issued`,
`moved_to_review`, `admin_note`, `dispute_opened`, `dispute_closed`. Es la base de
la evidencia de disputas.

**`disputes`:** `stripe_dispute_id`, `booking_id`, `reason`, `status`,
`amount_pence`, `due_by`, `evidence_submitted_at`, `outcome`,
`fault` (`keeper`/`platform`/`unclear`), `recovered_at`.

**`stripe_events`:** `id` (el id del evento de Stripe, único), `type`,
`processed_at`. Para que un webhook repetido no se procese dos veces.

**`strikes`** ya existe. Añadir `kind` (`late_cancel`/`no_show`).

**RLS:** todas las tablas nuevas se escriben solo desde el servidor con la clave
de servicio. Los participantes leen su propia reserva; `booking_events` y
`disputes` solo los admins. Añadir las políticas en
[db/policies.sql](db/policies.sql).

**Estado (2026-10-06): construido** ([db/schema.ts](db/schema.ts), migraciones
`0007` a `0011`). Diferencias respecto a la propuesta:
- La cuenta de Stripe del portero está en la tabla aparte `keeper_stripe_accounts`
  (`stripe_account_id`, `payouts_enabled`, `onboarding_complete`), no en `profiles`,
  porque `profiles` lo leen los equipos.
- `bookings` añade `cancelled_by`, `cancellation_charge_pct` y los importes en peniques
  como se proponía. Un índice único parcial (`bookings_active_match_uq`) permite una
  sola reserva activa por partido, así que tras cancelar se puede reservar otra vez.
- `strikes` tiene `kind` (`late_cancel`/`no_show`) y los campos de anulación
  `waived_at`, `waived_by` y `waived_reason`. La suspensión no se guarda: se calcula
  con `keeper_strike_points` y `keeper_is_suspended` (`db/strikes.sql`).
- `disputes` se amplió con la evidencia preparada, el estado de pago anterior, la
  culpa, la reversión de la transferencia y la devolución si se gana.
- Tablas nuevas: `keeper_debts` y `keeper_debt_deductions` (deudas del portero y lo
  descontado en cada reserva).
- Funciones de base de datos (RPC) con permiso solo para el servidor:
  `confirm_booking_payment`, `cancel_booking`, `reserve_debt_deduction`,
  `purge_checkin_coordinates` y `keeper_strike_points`. `accept_application` crea una
  reserva pendiente de pago y rechaza a un portero suspendido o ya reservado a esa hora.
- RLS: nadie escribe estas tablas desde el cliente. Los porteros ven sus propios
  strikes y deudas; los admins ven todo.

## 10. Endpoints, webhooks y tareas

**Webhook** `app/api/stripe/webhook/route.ts`:
- Leer el cuerpo **sin procesar** (`await req.text()`) y verificar la firma con
  `stripe.webhooks.constructEvent`. Rechazar si no coincide.
- Guardar el id del evento en `stripe_events` antes de procesar (idempotencia) y
  responder 2xx rápido; el trabajo pesado va a una tarea aparte.
- Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`,
  `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`,
  `charge.dispute.funds_withdrawn`, `account.updated`, `transfer.reversed`,
  `payout.failed`.

**Acciones de servidor:** crear checkout, check-in, confirmar o reportar,
cancelar (equipo y portero), acciones de admin (liberar, reembolsar, strike,
resolver revisión).

**Tareas programadas:**
- Liberación y revisión (cada hora).
- Recordatorios al equipo (fin del partido y +24 h) y al portero (24 h antes y
  30 minutos antes del inicio).
- Caducidad de `pending_payment` (30 minutos).
- Dónde ejecutarlas está por decidir (sección 16).

**Estado (2026-10-06):**
- **Webhook construido** (`app/api/stripe/webhook/route.ts`): firma verificada sobre el
  cuerpo sin procesar, idempotencia con `stripe_events` y un fallo libera el id para
  que el reintento de Stripe se procese. Gestiona `checkout.session.completed`,
  `expired` y `async_payment_succeeded` (el cobro usa Checkout alojado de Stripe, así
  que no se usa `payment_intent.succeeded`) y los cinco `charge.dispute.*`.
- **Webhooks de cuentas conectadas y de reembolsos (2026-10-08):**
  - Segundo destino `app/api/stripe/connect-webhook` (alcance "Connected accounts" en
    Stripe, secreto `STRIPE_CONNECT_WEBHOOK_SECRET`). `account.updated` (Stripe lo emite
    para las cuentas de Accounts v2; comprobado en el sandbox) vuelve a leer la cuenta
    y actualiza si el portero puede cobrar, sin el botón "Check again". `payout.failed`
    y `payout.paid` marcan o borran el aviso de pago fallido del portero
    (`keeper_stripe_accounts.payout_failed_at`, migración 0012), con botón a su panel
    de Stripe; un evento antiguo no pisa a uno nuevo.
  - Destino actual: `charge.refunded` de una reserva activa hecho fuera de la app (panel
    de Stripe) la manda a revisión de un admin; los reembolsos de la propia app se
    ignoran (la reserva ya está cancelada). Con la reserva ya pagada al portero solo
    queda en el registro de eventos y en los logs. `transfer.reversed` solo se registra
    (las reversiones de disputas también pasan por ahí).
  - Verificación de firma, id guardado y liberado si falla, compartidos en
    `lib/payments/webhook.ts`. En local el secreto de la CLI sirve para los dos destinos;
    en Vercel son dos destinos con dos secretos distintos.
  - Probado: firma inválida (400) y duplicados en los dos destinos, handler que falla
    (500 y se reprocesa), `account.updated` real tras forzar `payouts_enabled=false`,
    reembolso parcial real hecho en Stripe, reembolso de la app sin falsos avisos,
    `payout.failed` y `payout.paid` firmados (en orden y desordenados) y su aviso en el
    dashboard, y un ciclo real completo: Checkout, webhook, cancelación con reembolso,
    y otro con confirmación del equipo y transferencia de £30 al portero.
  - **No probado:** `payout.failed` real de Stripe (solo eventos firmados a mano);
    el pago en otra moneda con Adaptive Pricing (Checkout ofrece EUR a quien no esté en
    el Reino Unido; mis pruebas acabaron siempre en GBP). Conviene desactivar Adaptive
    Pricing en el panel de Stripe antes del lanzamiento. Sin `payment_failed`: con
    tarjeta en Checkout un fallo no crea reserva pagada.
- **Eventos pendientes:** ninguno de los previstos.
- **Acciones de servidor construidas:** crear checkout, check-in, confirmar, reportar,
  cancelar (equipo y portero) y las de admin (resolver revisión, anular strike,
  disputas).
- **Tarea programada construida:** `GET /api/cron/release` con `CRON_SECRET` como
  Bearer. Libera pagos vencidos, manda a revisión lo que no se puede liberar solo,
  reanuda cancelaciones a medias y borra las coordenadas del check-in a los 120 días.
  Es idempotente. `vercel.json` la programa **una vez al día** porque Vercel Hobby no
  permite más; para cada hora hace falta Vercel Pro (sección 16, decisión 5).
- **Recordatorios: hechos** (emails, ver sección 11).

## 11. Emails y notificaciones

Proveedor elegido en [TECH_STACK.md](TECH_STACK.md): **Resend** (todavía no está
instalado). Hay que añadir la dependencia, la clave y la verificación del dominio de
envío.

- Reserva confirmada (equipo y portero), con recibo.
- Recordatorio al portero 24 h antes y 30 minutos antes (check-in).
- Recordatorios al equipo al terminar el partido y a las 24 h.
- Pago liberado (portero) y aviso de liberación automática (equipo).
- Cancelación (ambas partes) y reembolso emitido, con aviso de que tarda días.
- Strike emitido (portero).
- Reserva en revisión (ambas partes).
- Disputa recibida (admin).
- Aprobación o rechazo del perfil del portero (pendiente del backlog de la fase 2).
- Pago fallido (equipo) y pago a portero fallido (portero).

**Estado (2026-10-08):** construidos los emails de reservas y pagos (reserva
confirmada, recordatorios de check-in, "¿jugó?", liberación y aviso previo,
cancelación y reembolso, strike, revisión, pago a portero fallido, pago no
completado). Van por la cola `email_outbox` con Resend; los recordatorios se
programan en Resend y se cancelan si la reserva cambia. **Pendiente:** aviso de
disputa (admin), aprobación del portero, pago fallido del equipo, emails de
marketplace y aviso de chat sin leer, y Supabase Auth por SMTP (necesita dominio).

## 12. Herramientas de admin

- Cola de **reservas en revisión** (sin check-in y equipo en silencio, o reporte):
  ver check-in, chat, confirmaciones, registro de eventos; botones liberar,
  reembolsar total o parcial, emitir strike.
- Lista de **disputas** con plazo, evidencia generada y botón de exportar; campo
  de culpa (portero, plataforma, poco claro) y seguimiento de recuperación.
- Gestión de **strikes** y de **vetos** de equipos.
- Marcar un check-in manualmente, con nota obligatoria.
- Panel con el **ratio de disputas** y reservas retenidas.

**Estado (2026-10-06):**
- Construido: cola de **reservas en revisión** (`/admin/payments`) con check-in,
  respuesta del equipo y nota; decisiones pagar al portero, reembolsar o reembolsar con
  strike. **Strikes** (`/admin/strikes`) con anulación con motivo, reservas próximas
  de un portero suspendido y marca de candidato a retirada. **Disputas**
  (`/admin/disputes`) con plazo, evidencia revisable, culpa, envío o aceptación,
  recuperación y ratio de los últimos 90 días.
- Pendiente (opcional para el primer lanzamiento): reembolso **parcial**, marcar un
  check-in a mano con nota, vetos de equipos y exportar la evidencia. **Decisión del
  fundador (2026-10-08): no construirlas hasta que aparezca un caso real** que las
  necesite; mientras tanto el admin resuelve esos casos a mano desde el panel de
  Stripe. La más probable de hacer falta primero es el reembolso parcial.

### 12.1 Historial de pagos del portero y del equipo (hecho el 2026-10-08, con partes pendientes)

**Construido y probado en local contra el sandbox (2026-10-08).** Página `/payments` con
vista por rol, enlace desde cada dashboard y entrada "Payments" en la barra lateral.
Código: `lib/payments/history.ts` (reglas puras, pruebas en `history.test.ts`),
`lib/data/payments.ts` (cargador de servidor que filtra por usuario; los descuentos por
deuda se leen con la clave de servicio solo para ese portero),
`components/app/payment-history.tsx` y `app/(app)/payments/export/route.ts` (CSV
mensual del portero). Sin cambios de SQL.
- Equipo: gastado, este mes, retenido y reembolsado; por reserva, tarifa más comisión,
  reembolso y coste final, con el aviso de que un reembolso tarda días.
- Portero: pagado (total y del mes), reservado, a la espera y en espera de decisión;
  por reserva su tarifa, descuento por deuda, lo transferido y el strike si lo hubo.
  No ve la comisión ni lo que pagó el equipo. CSV por mes, con protección contra fórmulas.
- Probado: los importes de 20 reservas (jugada, cancelaciones a más de 24 h, a 12 h y a
  1 h, cancelación del portero, en revisión, en disputa, con deuda) cuadran con el
  cálculo a mano; cada usuario ve solo lo suyo (2 porteros y 2 equipos); el CSV da 401
  sin sesión, 403 a un equipo y 400 con un mes inválido; y el estado vacío.
- **Panel de Stripe del portero (2026-10-08):** botón "Open my Stripe dashboard" en su
  vista (solo si ya puede cobrar). El enlace de acceso se genera al pulsar, es de un solo
  uso y se pide con `accounts.createLoginLink`, que funciona con las cuentas de Accounts
  v2 con panel Express: probado en el sandbox, abre la pantalla de acceso de Stripe
  Express. No se probó el inicio de sesión dentro del panel (pide un código por SMS o
  email).
- **Pendiente:** recibo descargable de Stripe para el equipo (decidido el 2026-10-08
  dejarlo para después: habría que guardar el enlace al confirmar el pago), la
  cronología (check-in, confirmación, liberación) al
  abrir una línea y revisar a mano la vista de escritorio. No se probó con una reserva
  nueva de Stripe de principio a fin, solo con reservas de pruebas anteriores y
  reservas sembradas.

**Propuesta original (2026-10-06):**

**Idea (a petición del fundador):** que el portero tenga un panel personal de sus
pagos y cancelaciones, y que el equipo vea también su historial de pagos. **No está
construido**; esto es la recomendación acordada para construirlo.

**Dónde vive:** una sola página `/payments` con una vista distinta según el rol, y una
tarjeta pequeña en cada dashboard que lleva a ella (el dashboard se queda ligero).
Ya existen rutas bajo `/payments/` (retorno del alta del portero y de la reserva), así
que el índice encaja. Los dos lados usan el mismo vocabulario de estados, con palabras
distintas según quién lo lee.

**Vista del portero**
- **Dashboard (4 cifras):** pagado este mes y en total; reservado para él (partidos
  futuros ya pagados por el equipo); pendiente de liberar (partidos jugados aún sin
  liberar); en revisión. Si existe, lo que debe por una disputa (hoy ya hay un aviso,
  `DebtCard`).
- **`/payments`:** lista por meses, una línea por partido: fecha, campo, equipo y lo
  que gana (su tarifa). Estado: Reservado, Jugado y pendiente (con la fecha en que se
  liberará), Pagado (con fecha), En revisión, Cancelado o En disputa. Al abrir una
  línea, la cronología (reservado, check-in, confirmación, liberación).
- **Cancelaciones:** quién canceló y cuándo, y qué cobró aun así (por ejemplo £15.00 si
  el equipo canceló con 12 h de margen, £30.00 con menos de 2 h, o £0 si canceló el
  propio portero), con el strike si lo hubo.
- **Descuentos por deuda:** cuánto se le descontó en cada pago y de qué disputa.
- **Exportación CSV por mes** para su declaración de impuestos (el portero es autónomo).
- **No se le muestra** la comisión ni el total que pagó el equipo (él cobra el 100% de
  su tarifa) ni el contenido de las disputas, solo su efecto.
- **Aviso visible:** "Pagado" significa que MatchKeeper ya se lo transfirió a su cuenta
  de Stripe. Cuándo llega a su banco lo decide Stripe y lo ve en su panel de Stripe,
  al que habría que enlazar (por verificar si se puede generar el enlace desde las
  cuentas de Accounts v2).

**Vista del equipo o jugador**
- **Dashboard:** total gastado este mes, retenido y reembolsado.
- **`/payments`:** una línea por reserva: fecha, campo, portero y **lo que pagó** con el
  desglose que vio al reservar (por ejemplo £30.00 de tarifa + £4.50 de comisión de
  servicio). Estados en lenguaje sencillo: Retenido hasta que se juegue, Liberado al
  portero, Reembolsado, Parcialmente reembolsado, En revisión, En disputa.
- **Cancelaciones:** lo cobrado y lo reembolsado (por ejemplo £17.25 y £17.25), con el
  aviso de que **un reembolso a tarjeta tarda varios días**.
- **Recibo descargable** (enlace al recibo de Stripe). Hoy ese enlace no se guarda:
  guardarlo al confirmar el pago.
- Sin exportación CSV por ahora: empezar con recibos.

**Cómo construirlo**
- **Un cargador de datos en el servidor** que filtra por el usuario con sesión y devuelve
  solo las columnas necesarias. Así no se abren permisos nuevos en la base de datos y es
  más fácil que lo mostrado coincida con Stripe. Hoy el portero lee sus propias
  reservas (`bookings`), `strikes` y `keeper_debts`, pero **no** `booking_events` ni
  `keeper_debt_deductions` (solo los admins); habría que servir esos descuentos desde
  el servidor y guardar el motivo de cada uno. Comprobar qué columnas expone la
  política de lectura de `bookings` antes de apoyarse en ellas.
- Datos que ya están: `keeper_payout_pence`, `payment_status`, `status`,
  `cancelled_by`, `cancellation_charge_pct`, `released_at`, `total_pence`,
  `platform_fee_pence`, `stripe_refund_id`, `keeper_checked_in_at`,
  `team_responded_at`.
- Cuando haya Resend: resumen mensual por email.

**Qué dinero se muestra al portero:** MatchKeeper sabe lo que **transfirió**; lo que
Stripe ingresa después en su banco (pagos diarios) no. Mostrar lo de MatchKeeper y
enlazar al panel de Stripe, para no prometer saldos que no controlamos.

**Pruebas:** cada usuario ve solo lo suyo (probar con la sesión de otro portero y de
otro equipo); los importes coinciden con Stripe en todos los casos de la sección 15
(jugado, cancelación parcial, cancelación total, deuda, disputa ganada); la exportación
coincide con la pantalla; los estados de ambos lados cuentan lo mismo.

## 13. Seguridad, privacidad e integridad

- Todos los importes se calculan en el servidor a partir de la candidatura en la
  base de datos, nunca desde datos del cliente.
- El webhook de Stripe no tiene sesión de usuario, así que escribe con la clave de
  servicio de Supabase (`SUPABASE_SERVICE_ROLE_KEY`). Va solo en el servidor,
  nunca en una variable `NEXT_PUBLIC_`. Ese acceso no está configurado todavía.
- Clave secreta de Stripe solo en el servidor. Variables de entorno, nunca en
  código ni en el cliente.
- Verificación de firma del webhook y claves de idempotencia en cada escritura.
- El registro de eventos es de solo inserción.
- **Ubicación del check-in:** es dato personal. Guardar solo lo necesario
  (coordenadas en el momento del check-in y distancia), explicarlo en la Política
  de privacidad. Plazo propuesto: coordenadas 120 días tras el partido (cubre el
  plazo de contracargo con tarjeta), luego se borran y se conserva solo la hora y
  si el check-in fue dentro del radio. Si hay disputa abierta, hasta resolverla.
  Confirmar con el abogado. Ya reflejado en la Política de privacidad.
- **Chats:** se conservan como evidencia. Decirlo en la Política de privacidad.
- Una reserva no se puede editar (fecha o campo) una vez pagada: hay que cancelar
  y crear otra.
- Comprobar solapamientos de calendario del portero antes de aceptar.

## 14. Copy y textos legales afectados

Si cambia alguna regla de este documento, actualizar **todos** estos sitios:

| Dónde | Qué dice |
|---|---|
| [components/platform/faq.tsx](components/platform/faq.tsx) | Tabla de cancelaciones, respuestas de pagos, no-show y cobros del portero |
| [app/(legal)/terms/page.tsx](app/(legal)/terms/page.tsx) | Cláusulas 3 (reservas), 4 (cancelaciones) y 5 (pagos y recuperación en disputas) |
| [app/(legal)/safety/page.tsx](app/(legal)/safety/page.tsx) | Secciones 2 y 3 |
| [components/platform/product-home.tsx](components/platform/product-home.tsx) | Puntos de Pricing y tarjetas de confianza |
| [components/platform/stat-band.tsx](components/platform/stat-band.tsx) | "Held until confirmed" y la comisión |
| [TECH_STACK.md](TECH_STACK.md) | Tabla de comisión y márgenes |

**Para el abogado (revisión antes de lanzar):**
- Términos: cargos por cancelación, plazos de confirmación y la liberación por
  silencio, cláusula de recuperación de disputas al portero, strikes y retirada,
  y que ninguna cláusula excluya derechos del consumidor (la Consumer Rights Act
  2015 no permite excluir que el servicio se preste con la diligencia debida, y
  los términos abusivos no vinculan al consumidor).
- Estatus del portero como autónomo y que la plataforma no es su empleador.
- Si retener fondos del equipo hasta la confirmación entra o no en el perímetro
  regulatorio de servicios de pago, y si la estructura con Stripe Connect lo cubre.
  Stripe aconseja consultar a un asesor legal sobre retener fondos.
- Privacidad: ubicación del check-in, conservación de chats, plazos.
- IVA sobre la comisión de MatchKeeper y sobre las comisiones de Stripe.
- Datos de la empresa obligatorios en el sitio (nombre, número de registro,
  domicilio social).

## 15. Casos de aceptación (tests)

Pruebas unitarias de las funciones puras (importes, cancelaciones, liberación) con
`now` inyectado. Pruebas de integración en modo de prueba de Stripe, con la CLI de
Stripe reenviando webhooks.

**Entorno de desarrollo:** el portátil corporativo usa una VPN con túnel forzado
que inspecciona TLS (Node da `SELF_SIGNED_CERT_IN_CHAIN` y los puertos de Postgres
están bloqueados, ver [TECH_STACK.md](TECH_STACK.md) sección 1.1). Antes de empezar,
comprobar que las llamadas a la API de Stripe y la CLI de Stripe funcionan desde
ese equipo. Si no, usar `NODE_EXTRA_CA_CERTS` o el almacén de certificados del
sistema, o probar desde otro entorno.

| # | Escenario | Resultado esperado | Estado (2026-10-06) |
|---|---|---|---|
| 1 | Pago completado, partido jugado, equipo confirma | Liberado, portero 3000, MatchKeeper 450 | Probado en sandbox (transferencia de £30.00) |
| 2 | Check-in hecho, equipo en silencio 3 días | Liberación automática | Probado con el cron |
| 3 | Sin check-in, equipo en silencio 3 días | Retenido, `under_review`, aviso a ambos, sin transferencia | Probado (pasa a revisión una sola vez). El aviso por email no existe |
| 4 | Sin check-in, equipo reporta no-show | Reembolso total, strike | Probado (reembolso 3450 y strike `no_show`) |
| 5 | Check-in hecho, equipo reporta no-show | `under_review`, sin liberación | Probado en vivo con el reporte "otro problema". El caso exacto de no-show con check-in lo cubre un test unitario |
| 6 | Equipo cancela a más de 24 h | Reembolso total, sin cobro | Probado (3450 reembolsados) |
| 7 | Equipo cancela entre 24 h y 2 h | Cobro 1725, reembolso 1725, portero 1500 | Probado |
| 8 | Equipo cancela a menos de 2 h | Cobro 3450, portero 3000 | Probado |
| 9 | Portero cancela a más de 24 h | Reembolso total, sin strike | Probado (el partido se reabre) |
| 10 | Portero cancela a menos de 24 h | Reembolso total, strike | Probado (con 12 h reabre, con 1 h queda cancelado) |
| 11 | Pago falla o checkout caduca | La candidatura vuelve a estar disponible | Caducidad probada. El pago fallido no (falta ese evento) |
| 12 | Webhook repetido dos veces | Se procesa una sola vez | Probado |
| 13 | Dos liberaciones del mismo booking | Una sola transferencia (idempotencia) | Probado (el cron repetido no duplica) |
| 14 | Tarjeta que exige 3D Secure | Se autentica y el cobro se completa | Probado en el navegador del usuario (el navegador integrado no pinta el iframe) |
| 15 | Disputa creada | Registro en `disputes`, evidencia generada, aviso al admin | Probado el registro y la evidencia. El aviso es solo en pantalla (sin email) |
| 16 | Cambio de hora (marzo y octubre) | Las ventanas de 24 h y 2 h no se alteran | Sin test dedicado. El cálculo usa milisegundos, así que no depende de la zona horaria |
| 17 | Redondeo (tarifas con peniques impares) | `keeperShare + feeShare + refund = total` siempre | Probado con tests unitarios |
| 18 | Check-in fuera de ventana o fuera de radio | Rechazado | Probado |

Además de estos casos se probaron: strikes y suspensión (matriz de puntos y paridad entre
SQL y TypeScript), disputas en todos sus caminos, descuento de deuda en pagos futuros,
solapamiento de calendario, borrado de coordenadas y los permisos de cada acción de admin.
**Hay 56 pruebas unitarias** (`npm test`).

## 16. Decisiones abiertas

Eran todas decisiones de pagos. **El 2026-10-06 se cerraron las que bloqueaban la
construcción** (columna "Estado"); quedan abiertas las de lanzamiento. Cada una lleva
la recomendación original. El estado global de lo pendiente está en la sección "Status
board" de [design-system/matchkeeper/MASTER.md](design-system/matchkeeper/MASTER.md).

| # | Decisión | Recomendación | Afecta a | Estado (2026-10-06) |
|---|---|---|---|---|
| 1 | Radio y ventana del check-in | 200 metros y de 30 minutos antes a 30 minutos después del inicio. Los campos pueden ser grandes y el GPS impreciso | Check-in | **Cerrada y construida** con esa recomendación. Falta probarla en un móvil real |
| 2 | Umbral de strikes | Aviso al primero, revisión al segundo y retirada al tercero en 90 días | Strikes | **Cerrada con otra regla** más estricta con el no-show: sistema por puntos (sección 1) |
| 3 | Si el portero cancela, qué pasa con el partido | Reabrirlo y avisar a los demás candidatos si quedan más de 2 horas. Si no, queda cancelado | Cancelaciones | **Cerrada y construida.** Los demás candidatos vuelven a pendiente, salvo los suspendidos. El aviso por email queda para Resend |
| 4 | Cuándo hace el portero el alta en Stripe | Antes de poder aplicar, como parte de la aprobación. Así los equipos solo ven porteros que pueden cobrar y "Identity confirmed" es cierto | Connect y onboarding | **Cerrada y construida:** sin pagos habilitados no puede aplicar ni ser elegido |
| 5 | Dónde ejecutar las tareas programadas | Vercel Cron cada hora (el plan Pro está presupuestado en TECH_STACK). Alternativa: `pg_cron` en Supabase | Liberación | **Construida como Vercel Cron.** `vercel.json` la lanza una vez al día (límite de Hobby). **Abierta:** pasar a cada hora con Vercel Pro antes de lanzar |
| 6 | Calendario de pagos al portero | Diario por defecto. Semanal si se quiere pagar menos comisiones fijas de 10p | Connect | **Cerrada: diario** (secciones 8 y 18) |
| 7 | Límites para cuentas nuevas | Email verificado y, si aparece fraude, tope en la primera reserva y en reservas de última hora | Prevención | **Abierta, no construida.** Revisar si aparece fraude |
| 8 | Equipo y portero cancelan en la misma ventana | Aplica la regla de quien cancela primero | Cancelaciones | **Cerrada y construida** (`cancel_booking` bloquea la fila y gana la primera) |
| 9 | IVA sobre la comisión | Consultar con un asesor fiscal antes de fijar precios | Precio | **Abierta.** Depende de un asesor |

**Investigación sobre transferencias revertidas: resuelta el 2026-10-06** (sección 18).
Se puede revertir, con la limitación del saldo; por eso existe la deuda del portero.

**Ya resuelto:** el proveedor de email es Resend, según TECH_STACK.md.

## 17. Orden de implementación sugerido

Progreso a 2026-10-06 (todo lo marcado se probó en el sandbox, ver sección 15):

1. **Prerrequisitos:** resto del producto terminado, Términos revisados, empresa
   constituida, cuenta de Stripe verificada. *Producto terminado; sandbox de Stripe
   creado. Faltan la revisión legal, la empresa y la cuenta verificada.*
2. **Esquema y funciones puras:** migraciones, cálculo de importes, cancelaciones
   y reglas de liberación, con sus tests. No requiere Stripe. *Hecho.*
3. **Onboarding de porteros en Connect:** cuenta Express, enlace de alta,
   `account.updated` y bloqueo de selección hasta tener pagos habilitados. *Hecho,
   incluido el webhook `account.updated` (2026-10-08).*
4. **Cobro al elegir portero:** checkout con 3D Secure, casilla de Términos,
   webhook y reserva confirmada. *Hecho.*
5. **Check-in y respuesta del equipo:** botones, recordatorios, registro de eventos.
   *Hecho, salvo los recordatorios (Resend).*
6. **Liberación automática y cola de revisión:** tarea programada y herramientas
   de admin. *Hecho.*
7. **Cancelaciones, reembolsos y strikes.** *Hecho (strikes con el sistema de puntos).*
8. **Disputas:** webhooks, generación de evidencia, panel de admin y recuperación.
   *Hecho.*
9. **Endurecimiento:** Radar, monitorización del ratio de disputas, revisión del
   registro de auditoría y pruebas de extremo a extremo. *Ratio de disputas y webhooks
   hechos. Pendientes: Radar y repetir las pruebas en modo real.*
10. **Lanzamiento (añadido el 2026-10-06):** Resend con dominio verificado; Stripe en
    modo real; en Vercel las variables de entorno (`STRIPE_SECRET_KEY`,
    `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`), el endpoint
    del webhook con los eventos de `checkout.session.*` y `charge.dispute.*`, y el
    plan Pro para el cron cada hora; prueba del check-in en un móvil real; revisión
    legal; empresa constituida.

## 18. Verificado frente a pendiente de verificar

**Verificado el 2026-10-02** en la documentación de Stripe (stripe.com/gb/pricing,
stripe.com/gb/connect/pricing, su página sobre comisiones de reembolsos y
docs.stripe.com/connect):
- Tarjeta británica estándar 1.5% + 20p, premium 2.8% + 20p, EEA 2.5% + 20p,
  internacional 3.15% + 20p.
- Stripe **no devuelve** su comisión al reembolsar. Los reembolsos en tarjeta no
  cuestan nada por sí mismos.
- Connect cuando la plataforma fija los precios: 2 libras al mes por portero
  activo y 0.25% + 10p por cada pago enviado.
- Disputa: 20 libras; si respondes, otras 20, que se devuelven si ganas.
- En cargos indirectos, los contracargos afectan al saldo de la **plataforma**, y
  elegir que Stripe asuma los saldos negativos no elimina esa exposición propia.
- El tipo de panel de una cuenta conectada es inmutable.
- El débito automático de saldos negativos funciona con bancos del Reino Unido.
- Las plataformas nuevas usan la API Accounts v2.

**Verificado el 2026-10-06** en la documentación de Stripe y probando en el sandbox:
- En cargos separados con transferencias, Stripe descuenta de la **plataforma** el
  importe de la disputa y sus tasas. La plataforma responde por API, no el portero.
- Una transferencia a un portero se puede revertir, total o parcial
  (`POST /v1/transfers/:id/reversals`). En transferencias con `transfer_group` la
  documentación dice que solo si la cuenta del portero tiene saldo para cubrirla.
  En el sandbox la reversión funcionó incluso con saldo cero, así que **no se pudo
  probar un fallo natural**.
- Si se gana la disputa, lo revertido se vuelve a transferir al portero con una nueva
  transferencia.
- La evidencia se envía por API (`disputes.update` con `submit`). Puede guardarse sin
  enviar. Cada campo de texto admite hasta 20.000 caracteres y hay una fecha límite
  por disputa. En el sandbox, para ganar hay que enviar como `uncategorized_text`
  exactamente `winning_evidence`.
- Tarjetas de prueba de disputa: `pm_card_createDispute` (fraude),
  `pm_card_createDisputeProductNotReceived` y `pm_card_createDisputeInquiry`.
  `pm_card_bypassPending` deja el saldo disponible al instante.
- Un `charge.dispute.funds_withdrawn` puede llegar antes que el `created`.
- La CLI de Stripe y la API funcionan desde el portátil corporativo con su VPN.
- Un retraso de pagos de hasta 31 días (`delay_days_override`) solo aplica a cargos
  con `on_behalf_of` o directos, no a transferencias de plataforma.

**Por verificar:** si Stripe real revierte una transferencia con la cuenta del portero
sin saldo y si debita su banco; duración exacta de las retenciones de tarjeta (ya no
se usan); reglas del descriptor; condiciones del traspaso de responsabilidad con 3D
Secure; plazos de las pruebas en disputas reales; qué incluye Radar en la versión
estándar; límites de Vercel Cron en el plan elegido; nombres de los eventos de cuenta
de Accounts v2; IVA sobre las comisiones de Stripe.

**Sin probar al 2026-10-06:** geolocalización del check-in en un móvil real, el cron
en Vercel, una transferencia a una cuenta del portero restringida, disputas de tipo
consulta (`warning_*`), `debit_negative_balances` y todo en modo real.

## 19. Discrepancias con otros documentos

[PRODUCT_PLAN.md](PRODUCT_PLAN.md) se redactó antes y se ha corregido en estos
puntos para que coincida con este documento:
- Umbral intermedio de cancelación: era 6 horas, ahora es 2.
- El portero cancelando "en cualquier momento" daba strike: ahora solo si cancela
  con menos de 24 horas.
- La confirmación automática era a las 12 horas: ahora es a los 3 días y solo con
  check-in.
- Usaba `application_fee_amount`: no aplica a este tipo de cargo.
- Decía que Stripe es el merchant of record y que MatchKeeper no toca el dinero.
  Con cargos indirectos, el cliente transacciona con la plataforma y el saldo
  negativo de un contracargo es de la plataforma. Si esto tiene implicaciones
  regulatorias es una pregunta para el abogado (sección 14).
