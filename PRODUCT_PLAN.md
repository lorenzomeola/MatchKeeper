# MatchKeeper — Product Plan

> Plataforma web (app móvil en el futuro, cuando haya base de usuarios validada)
> para conectar jugadores/equipos que necesitan un portero para su partido con
> arqueros freelance disponibles cerca de ellos. Piloto: Londres, UK (GBP).

Estado: fase de validación (landing + formularios) completada/en curso. Este
documento define el producto completo a construir después de la validación.

## 1. Visión

"Every match deserves a real keeper." MatchKeeper es un marketplace tipo
Uber/Upwork para porteros de fútbol: el jugador publica su partido, los
porteros cercanos aplican, el jugador elige, se paga de forma segura dentro de
la app y ambos se califican al terminar.

## 2. Usuarios y roles

| Rol | Qué es | Puede hacer |
|---|---|---|
| **Jugador** | Cuenta base de cualquier usuario que necesita un portero | Publicar partidos, ver aplicantes, aceptar/pagar, chatear, calificar, ver historial |
| **Equipo** | Perfil opcional que un Jugador puede crear/administrar (agrupa un roster fijo, no es un tipo de cuenta separado) | Todo lo del Jugador + gestionar miembros/roster + publicar partidos "como equipo" |
| **Portero (arquero)** | Cuenta freelance verificada | Ver partidos disponibles cerca, aplicar con su tarifa, gestionar su calendario/disponibilidad, chatear, cobrar, acumular reseñas y contador de partidos |
| **Admin** | Staff de MatchKeeper | Aprobar/rechazar porteros nuevos, moderar reseñas/disputas, gestionar cancelaciones y reembolsos manuales, ver métricas |

**Nota de diseño clave**: no hay una cuenta "Equipo" separada de "Jugador".
Cualquier jugador puede reservar un portero para un partido informal con
amigos, o crear un perfil de Equipo para partidos recurrentes con roster fijo.
Esto simplifica el modelo de permisos (2 tipos reales de cuenta: Jugador y
Portero, más Admin interno).

## 3. Modelo de negocio

- **Comisión al equipo/jugador** (no al portero): el portero recibe el 100%
  de la tarifa que él mismo fija; MatchKeeper cobra un 15% adicional al
  jugador en el checkout. Esa comisión es la parte que no se transfiere al
  portero (detalle en `PAYMENTS_SPEC.md`).
- El portero fija su propia tarifa al aplicar a cada partido (no hay tarifa
  fija de plataforma) — refuerza el modelo de "aplicación", no "catálogo".
- Fases futuras (no MVP): suscripción premium para porteros (más visibilidad),
  partnerships/beneficios tipo ArquerosYa+Reusch para reclutar porteros.

## 4. Flujo principal (core loop)

1. **Publicar partido**: el jugador (solo o "como equipo") crea un partido:
   fecha/hora, ubicación (pin en mapa), duración, nivel, presupuesto sugerido
   (opcional, orientativo — el portero puede aplicar con otra tarifa).
2. **Descubrimiento**: porteros dentro de un radio configurable ven el
   partido en su feed/mapa de "partidos disponibles".
3. **Aplicación**: el portero aplica indicando su tarifa (y opcionalmente un
   mensaje corto).
4. **Selección**: el jugador ve la lista de aplicantes (foto, rating
   promedio, # partidos jugados, tarifa, distancia) y elige uno.
5. **Pago con retención (escrow)**: al aceptar, se cobra al jugador vía
   Stripe (ver §5); el dinero queda retenido por Stripe, no llega aún al
   portero. Partido queda **confirmado** en el calendario de ambos.
6. **Chat**: chat 1:1 por candidatura. El equipo puede abrirlo con cualquier
   candidato antes de aceptar, y el portero responde después, con controles contra
   la fuga de datos de contacto y el spam. Tras aceptar, sigue con el elegido para
   coordinar detalles (llegar más temprano, cambios de última hora, etc.). Detalle
   en `design-system/matchkeeper/MASTER.md`, ítem 12.
7. **Día del partido**: ambos ya tienen la info y ubicación en su calendario.
8. **Check-in y confirmación de partido jugado**: el portero toca "I have
   arrived" al llegar al campo. El equipo confirma o reporta durante los 3 días
   siguientes al fin del partido. Si no responde, el pago se libera
   automáticamente solo si hubo check-in (ver `PAYMENTS_SPEC.md`).
9. **Liberación del pago**: al confirmarse, Stripe transfiere los fondos
   (menos la comisión ya descontada) a la cuenta Connect del portero.
10. **Reseña y contador**: el jugador puede calificar al portero
    (equipo/jugador → portero, no bidireccional en el MVP). El partido se
    suma automáticamente al contador de "partidos jugados" del portero.

## 5. Pagos — Stripe Connect (escrow simple)

- **Cuentas Connect Express** para los porteros (onboarding de Stripe ya
  incluye KYC básico requerido para poder cobrar — reduce carga legal propia).
- **Patrón "Separate Charges and Transfers"**: el cobro al jugador entra a la
  cuenta de plataforma al elegir al portero; el dinero queda retenido en el
  saldo de la plataforma hasta que se dispara una **Transfer** explícita a la
  Connected Account del portero tras la confirmación del partido (paso 9 del
  flujo). La comisión es lo que no se transfiere. No se usa
  `application_fee_amount`, que es de otros tipos de cargo.
- Con este patrón el cliente transacciona con la plataforma: los contracargos
  afectan al saldo de MatchKeeper, no al del portero. Si retener fondos del
  jugador entra en el perímetro regulatorio de servicios de pago es una
  pregunta para el abogado antes de lanzar (ver `PAYMENTS_SPEC.md`, sección 14).
  Stripe gestiona el KYC de los porteros.
- Moneda: GBP. Mercado inicial: UK únicamente (simplifica impuestos/KYC).

### Política de cancelación

| Quién cancela | Cuándo | Resultado |
|---|---|---|
| Jugador | Más de 24 h antes del partido | Reembolso 100% al jugador |
| Jugador | Entre 24 h y 2 h antes | Se cobra el 50%: el portero cobra su parte, el otro 50% se reembolsa |
| Jugador | Menos de 2 h antes o no-show | Se cobra el 100%, el portero cobra completo |
| Portero | Más de 24 h antes | Reembolso 100% al jugador, sin penalización |
| Portero | Menos de 24 h antes o no-show | Reembolso 100% al jugador + **strike** en el perfil del portero |

El detalle de importes, comisión sobre cobros parciales, check-in y disputas está
en `PAYMENTS_SPEC.md`, que manda sobre este documento en estos temas.

- Strikes (decidido y construido el 2026-10-06): sistema por puntos. Un no-show
  son 3 puntos durante 12 meses y una cancelación tardía 1 punto durante 90 días.
  Con 3 puntos el portero queda suspendido (no puede aplicar a partidos nuevos), con
  2 lo revisa un admin, y dos no-shows en 12 meses lo marcan para una retirada
  definitiva que decide una persona. Un admin puede anular un strike. Detalle en
  `PAYMENTS_SPEC.md`, sección 1.
- Disputas con el banco: el sistema prepara la evidencia y un admin decide si la
  envía; si la pierde por culpa del portero se le recupera lo que cobró por esa
  reserva (revirtiendo su pago o descontándolo de pagos futuros). Las demás
  situaciones (por ejemplo "el portero no llegó pero no se reportó a tiempo") las
  resuelve un admin desde la cola de revisión.

## 6. Mapa

- **Portero**: ve un mapa/feed de partidos disponibles cerca de su ubicación
  configurada (no ve la ubicación de otros porteros).
- **Jugador/equipo**: ve un mapa de porteros disponibles cerca (exploratorio,
  para hacerse una idea de oferta local) — pero la contratación real siempre
  pasa por publicar el partido y recibir aplicaciones, no por "reservar"
  directo desde el mapa en el MVP.
- **Visibilidad**: el mapa funcional (con pines reales) requiere cuenta
  logueada — protege privacidad/seguridad de ubicación de los porteros. La
  landing pública puede mostrar algo agregado tipo "N porteros activos en
  Londres" sin pines exactos.

## 7. Calendario

- Cada usuario (jugador y portero) tiene un calendario personal con sus
  partidos confirmados.
- El portero además puede marcar franjas de disponibilidad/no-disponibilidad
  (para que solo vea/reciba partidos en horarios que le sirven — v2 si no
  entra en el MVP inicial).
- Integración con calendarios externos (Google Calendar/iCal export): fase
  futura, no MVP.

## 8. Reseñas y contador de partidos

- Reseñas: solo **jugador/equipo → portero** (estrellas + comentario) tras un
  partido confirmado como jugado.
- Contador de "partidos jugados" en el perfil del portero: se incrementa
  automáticamente al confirmarse cada partido (paso 9), es público en su
  perfil (junto con el rating promedio) — es la señal de confianza principal
  que usa el jugador para elegir entre aplicantes.

## 9. Verificación de porteros

- MVP: **revisión manual por Admin** antes de que el perfil del portero sea
  visible/pueda aplicar a partidos (perfil + foto + datos básicos).
- Verificación de identidad formal (ID check automatizado): fuera de alcance
  del MVP, posible fase futura si el volumen lo justifica.
- Excepción: cuando se activen los pagos, Stripe Connect Express verifica la
  identidad del portero en el alta de su cuenta, y un portero no puede ser
  elegido sin completarla. Por eso la web puede decir "Identity confirmed" (ver
  `PAYMENTS_SPEC.md`, sección 3).

## 10. Fases (roadmap del MVP)

Nota 1: estas Fases 1, 2 y 3 son del **producto**. No confundir con las "fases"
del rediseño visual de la plataforma, descritas en
`design-system/matchkeeper/MASTER.md` (fase 1: `/home`; fase 2: login, signup,
onboarding del portero y dashboards de usuario y admin).

Nota 2: el sitio publicado asume que el lanzamiento público ya incluye pagos con
Stripe, aunque esta hoja de ruta sitúa los pagos en la Fase 2. Pendiente de
decidir (ver "Status board" en `MASTER.md`).

**Estado a 2026-10-06:** la Fase 1 está construida (ver el "Status board" de
`MASTER.md`). De la Fase 2, **los pagos con Stripe Connect, la confirmación y
liberación, las cancelaciones con strikes, las disputas y las reseñas están
construidos y probados en el sandbox de Stripe**. Falta lo que impide un
lanzamiento con dinero real: emails (Resend), algunos webhooks, la configuración en
Vercel y Stripe en modo real, la revisión legal y la empresa constituida.

**Fase 1 — Core (lanzamiento)**
- Cuentas (Jugador / Portero), perfiles, perfil de Equipo opcional.
- Publicar partido, feed de partidos por radio, aplicar, seleccionar aplicante.
- Calendario personal con partidos confirmados.
- Mapa (según rol, logueado).
- Chat 1:1 jugador↔portero.
- Aprobación manual de porteros por Admin.

**Fase 2 — Pagos y confianza** *(construida y probada en sandbox, 2026-10-06)*
- Stripe Connect Express (onboarding porteros) + pago con retención.
- Confirmación de partido jugado (auto + manual) y liberación de pago.
- Política de cancelación + strikes.
- Reseñas + contador de partidos jugados.
- **Hecho el 2026-10-08:** historial de pagos en `/payments`: el portero ve lo ganado,
  lo retenido y cada partido con sus cancelaciones y descuentos (con CSV mensual); el
  equipo ve lo pagado con desglose y lo reembolsado. Pendiente: recibo descargable de
  Stripe para el equipo (ver `PAYMENTS_SPEC.md`, sección 12.1).

**Fase 3 — Crecimiento (post-MVP)**
- Disponibilidad configurable del portero, integración calendario externo.
- Suscripciones premium / partnerships para porteros.
- Expansión a otras ciudades UK (Manchester, Birmingham, etc. — ya evaluadas
  como "maybe later").
- App móvil nativa (cuando haya base de usuarios validada en web).

## 11. Fuera de alcance (explícitamente, por ahora)

- Reseñas bidireccionales (portero → jugador).
- Verificación de identidad formal automatizada.
- Reserva directa desde el mapa sin pasar por aplicaciones.
- Multi-idioma (el producto completo arranca en inglés, como la landing).
- App móvil nativa.

## 12. Métricas de éxito (a definir con más detalle más adelante)

- # partidos publicados / # partidos confirmados (tasa de conversión).
- # porteros activos y aprobados en Londres.
- Rating promedio de porteros y tasa de cancelación (jugador vs portero).
- Retención: % de jugadores/porteros que repiten en 30/60/90 días.

## 13. Beta gratuita sin pagos (decidido 2026-10-13)

**Objetivo:** validar con usuarios reales si la plataforma se usa, antes de asumir los
costes y las obligaciones de mover dinero (empresa, Stripe real, IVA, revisión legal
completa). La beta es la "versión gratuita" del producto.

- **Alcance:** unos meses, grupo cerrado de 20-50 usuarios en Londres, solo mayores de
  18, porteros aprobados a mano, etiqueta de beta en la web.
- **Incluye:** cuentas, publicar partido, candidaturas, elección por el equipo, chat,
  calendario, mapa, check-in, reseñas y strikes.
- **No incluye:** cobro con tarjeta, comisión del 15 %, pagos a porteros, historial de
  pagos. La tarifa del portero es orientativa y se acuerda fuera de la app. MatchKeeper
  no cobra nada ni como depósito, comisión o propina.
- **Decisión pendiente de confirmar:** en la beta el equipo elige entre los candidatos
  (como hoy). El modo "el primero que aplica se queda" queda para un nivel gratuito
  posterior.
- **Implementación:** interruptor en base de datos (`payments_enabled`, apagado en la
  beta); las reservas hechas sin pagos llevan `payment_status = 'none'`. El código de
  pagos se conserva y vuelve al encender el interruptor. **Estado: construido y probado el 2026-10-13** con sesiones reales y la interfaz, con el
  interruptor apagado y encendido (aplicar sin Stripe, elegir portero, check-in,
  confirmar, no-show, cancelación tardía con strike, cron y cola de revisión, y el cobro
  con Stripe Checkout al encender). No probado: emails en bandeja real, Vercel y Stripe live. Detalle en
  `PAYMENTS_SPEC.md`, sección 0.
- **Métricas a medir:** partidos publicados, % cubiertos, tiempo hasta la primera
  candidatura, repetición a 30 días, no-shows y cuántos usuarios piden protección de
  pago. Los umbrales de éxito se fijan antes de abrir la beta.
- **Hoja de ruta tras la beta:** (1) "booking protegido" opcional con pago retenido,
  reembolso por no-show y comisión del 15 % (ya construido); (2) suscripciones con
  extras (ver candidatos ordenados, perfil destacado) solo si la demanda es clara. Las
  suscripciones no son la base del negocio.
- **Legal mínimo:** Términos con cláusulas de lesiones, responsabilidad y 18+ (hechas),
  política de privacidad ajustada, checkbox de 18+ en el alta, comprobaciones de
  protección de datos (el founder reside en Bélgica: aplica el GDPR de la UE y quizá el
  británico; revisar tasa del ICO y representante en UK), nota interna del Online Safety
  Act y consulta a un contable belga. La forma jurídica (autónomo o Ltd) **no está
  decidida**; hace falta antes de cobrar.
