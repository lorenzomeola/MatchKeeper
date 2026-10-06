# MatchKeeper: especificación de pagos, check-in y disputas

Documento listo para implementar. Recoge todo lo decidido sobre cómo se cobra,
cómo se retiene y se libera el dinero, cómo funcionan las cancelaciones, el
check-in del portero y las disputas. Si este documento y otro difieren en estos
temas, **este documento manda**.

## 0. Estado y cuándo se implementa

- **Decidido el 2026-10-02.** Las cifras de Stripe se verificaron ese día en su
  documentación oficial (ver sección 18).
- **Nada de esto está construido.** Lo único publicado es la copy: el FAQ de
  `/home` ([components/platform/faq.tsx](components/platform/faq.tsx)),
  [Terms](app/(legal)/terms/page.tsx) y [Safety](app/(legal)/safety/page.tsx)
  ya describen estas reglas como si existieran.
- **Se implementa después de terminar** el resto del desarrollo: páginas,
  login/signup, onboarding del portero, dashboards de usuario y admin. No antes.
- **Antes de lanzar con pagos reales:** revisión de Términos por un abogado
  (sección 14) y empresa constituida con cuenta de Stripe verificada.
- El sistema de diseño de las pantallas nuevas está en
  [design-system/matchkeeper/MASTER.md](design-system/matchkeeper/MASTER.md).

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
| Strikes repetidos | Retirada de la plataforma (umbral por decidir, ver sección 16) |
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

**Cómo se recupera dinero de un portero:** Stripe intenta compensar con pagos
futuros y debitar su cuenta bancaria (el débito automático de saldos negativos
funciona con bancos del Reino Unido); la plataforma puede pausar sus pagos; y
Stripe puede retener una reserva en el saldo de la plataforma. **Revertir una
transferencia ya hecha no se confirmó en la documentación consultada: verificar
antes de depender de ello.**

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

## 12. Herramientas de admin

- Cola de **reservas en revisión** (sin check-in y equipo en silencio, o reporte):
  ver check-in, chat, confirmaciones, registro de eventos; botones liberar,
  reembolsar total o parcial, emitir strike.
- Lista de **disputas** con plazo, evidencia generada y botón de exportar; campo
  de culpa (portero, plataforma, poco claro) y seguimiento de recuperación.
- Gestión de **strikes** y de **vetos** de equipos.
- Marcar un check-in manualmente, con nota obligatoria.
- Panel con el **ratio de disputas** y reservas retenidas.

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

| # | Escenario | Resultado esperado |
|---|---|---|
| 1 | Pago completado, partido jugado, equipo confirma | Liberado, portero 3000, MatchKeeper 450 |
| 2 | Check-in hecho, equipo en silencio 3 días | Liberación automática |
| 3 | Sin check-in, equipo en silencio 3 días | Retenido, `under_review`, aviso a ambos, sin transferencia |
| 4 | Sin check-in, equipo reporta no-show | Reembolso total, strike |
| 5 | Check-in hecho, equipo reporta no-show | `under_review`, sin liberación |
| 6 | Equipo cancela a más de 24 h | Reembolso total, sin cobro |
| 7 | Equipo cancela entre 24 h y 2 h | Cobro 1725, reembolso 1725, portero 1500 |
| 8 | Equipo cancela a menos de 2 h | Cobro 3450, portero 3000 |
| 9 | Portero cancela a más de 24 h | Reembolso total, sin strike |
| 10 | Portero cancela a menos de 24 h | Reembolso total, strike |
| 11 | Pago falla o checkout caduca | La candidatura vuelve a estar disponible |
| 12 | Webhook repetido dos veces | Se procesa una sola vez |
| 13 | Dos liberaciones del mismo booking | Una sola transferencia (idempotencia) |
| 14 | Tarjeta que exige 3D Secure | Se autentica y el cobro se completa |
| 15 | Disputa creada | Registro en `disputes`, evidencia generada, aviso al admin |
| 16 | Cambio de hora (marzo y octubre) | Las ventanas de 24 h y 2 h no se alteran |
| 17 | Redondeo (tarifas con peniques impares) | `keeperShare + feeShare + refund = total` siempre |
| 18 | Check-in fuera de ventana o fuera de radio | Rechazado |

## 16. Decisiones abiertas

Todas son de pagos y ninguna bloquea el resto del desarrollo. Hay que cerrarlas
antes de empezar a construir esta especificación. Cada una lleva mi recomendación.
El estado global de lo pendiente está en la sección "Status board" de
[design-system/matchkeeper/MASTER.md](design-system/matchkeeper/MASTER.md).

| # | Decisión | Recomendación | Afecta a |
|---|---|---|---|
| 1 | Radio y ventana del check-in | 200 metros y de 30 minutos antes a 30 minutos después del inicio. Los campos pueden ser grandes y el GPS impreciso | Check-in |
| 2 | Umbral de strikes | Aviso al primero, revisión al segundo y retirada al tercero en 90 días | Strikes |
| 3 | Si el portero cancela, qué pasa con el partido | Reabrirlo y avisar a los demás candidatos si quedan más de 2 horas. Si no, queda cancelado | Cancelaciones |
| 4 | Cuándo hace el portero el alta en Stripe | Antes de poder aplicar, como parte de la aprobación. Así los equipos solo ven porteros que pueden cobrar y "Identity confirmed" es cierto | Connect y onboarding |
| 5 | Dónde ejecutar las tareas programadas | Vercel Cron cada hora (el plan Pro está presupuestado en TECH_STACK). Alternativa: `pg_cron` en Supabase | Liberación |
| 6 | Calendario de pagos al portero | Diario por defecto. Semanal si se quiere pagar menos comisiones fijas de 10p | Connect |
| 7 | Límites para cuentas nuevas | Email verificado y, si aparece fraude, tope en la primera reserva y en reservas de última hora | Prevención |
| 8 | Equipo y portero cancelan en la misma ventana | Aplica la regla de quien cancela primero | Cancelaciones |
| 9 | IVA sobre la comisión | Consultar con un asesor fiscal antes de fijar precios | Precio |

**Investigación pendiente (tarea mía, no una decisión):** comprobar en la
documentación de Stripe si se puede revertir una transferencia ya enviada a un
portero tras perder una disputa. Está en la sección 18.

**Ya resuelto:** el proveedor de email es Resend, según TECH_STACK.md.

## 17. Orden de implementación sugerido

1. **Prerrequisitos:** resto del producto terminado, Términos revisados, empresa
   constituida, cuenta de Stripe verificada.
2. **Esquema y funciones puras:** migraciones, cálculo de importes, cancelaciones
   y reglas de liberación, con sus tests. No requiere Stripe.
3. **Onboarding de porteros en Connect:** cuenta Express, enlace de alta,
   `account.updated` y bloqueo de selección hasta tener pagos habilitados.
4. **Cobro al elegir portero:** checkout con 3D Secure, casilla de Términos,
   webhook y reserva confirmada.
5. **Check-in y respuesta del equipo:** botones, recordatorios, registro de eventos.
6. **Liberación automática y cola de revisión:** tarea programada y herramientas
   de admin.
7. **Cancelaciones, reembolsos y strikes.**
8. **Disputas:** webhooks, generación de evidencia, panel de admin y recuperación.
9. **Endurecimiento:** Radar, monitorización del ratio de disputas, revisión del
   registro de auditoría y pruebas de extremo a extremo.

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

**Por verificar antes de construir:** transferencias revertidas; duración exacta
de las retenciones de tarjeta (se asume unos 7 días); reglas del descriptor;
condiciones del traspaso de responsabilidad con 3D Secure; plazos de las pruebas
en disputas; qué incluye Radar en la versión estándar; calendario de pagos por
defecto; límites de Vercel Cron; IVA sobre las comisiones de Stripe.

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
