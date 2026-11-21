# MatchKeeper — Product Plan

> Plataforma web (app móvil en el futuro, cuando haya base de usuarios validada)
> para conectar jugadores/equipos que necesitan un portero para su partido con
> arqueros freelance disponibles cerca de ellos. Piloto: Londres, UK (GBP).

## Versiones de lanzamiento

| Versión | Estado | Alcance y activación |
|---|---|---|
| Beta gratuita | Actual | Registro público 18+, Londres, porteros aprobados manualmente. Partidos, candidaturas, elección por el equipo, chat, calendario, mapa, check-in, reseñas y strikes. MatchKeeper no cobra ni garantiza pagos. |
| Booking protegido | Construido, inactivo | Stripe Connect, comisión del 15% al equipo, checkout, pagos retenidos, reembolsos, cancelaciones, transferencias y disputas. Requiere `payments_enabled=true` explícito y pasar los gates de `PAYMENTS_SPEC.md`. |
| Suscripciones | Posibilidad futura, no diseñada | Sin prestaciones, precio, código ni oferta confirmados. Requiere evidencia de beta y una decisión de producto separada; no forma parte del booking protegido. |

La Beta es de registro público. El objetivo de 20–50 usuarios es una meta de captación, no un límite de acceso. Una fila ausente de `payments_enabled` equivale a Beta gratis; errores de lectura o valores inválidos bloquean reservas.

Estado al 2026-10-26: Beta gratuita publicada en **https://matchkeeperuk.com** tras promoción controlada autorizada. El booking protegido está implementado, pero permanece inactivo. Suscripciones no diseñadas.

### Seguimiento al 2026-10-26

**Decision vigente 2026-10-28:** a peticion del propietario se revierte la prueba de Permanent
Geocoding y se restaura Search Box solo en staging (`114cd04`), conservando el arreglo movil.
Production no se toca. Recargar pestanas abiertas para dejar de ejecutar el cliente anterior.
No se generan nuevas consultas Permanent desde el cliente restaurado; el consumo pasado
no se anula y Search Box tambien puede tener costes. Se espera respuesta de Mapbox sobre
busqueda por nombre de campo y almacenamiento permitido; la reversion no resuelve esa licencia.

**Actualizacion 2026-10-27, Mapbox:** migracion a Permanent Geocoding enviada primero a
staging en `c285c6d`, sin promover a Production. Siempre `permanent=true`, sin autocomplete
ni fallback temporal/Search Box; busqueda por direccion/codigo postal, con alternativa
de pin manual. Continue no consulta la API. Coste inicial publicado US$5/1.000 consultas,
sin franquicia gratis; GPS de check-in sin cambios ni llamadas de geocoding.
Mapbox confirmo cuenta actual con tarjeta sin Enterprise/minimo; no autorizo almacenamiento
de resultados Search Box ni regularizo historicos. Pruebas API/privacidad, lint focalizado
y build/TypeScript correctos. Busqueda real en staging HTTP 200 verificada con `permanent=true`,
seleccion/coordenadas/paso 2 y alternativa manual correctas; sin publicar partidos.
Privacidad actualizada visible en staging. Production sigue en `72cd893`, pendiente de
autorizacion separada para promover. El propietario comprobo que no encuentra POIs
“Warren Sports Pitch” ni “Haggerston Park Football Pitches”: regresion de cobertura frente
a la busqueda anterior, con pin manual como alternativa no equivalente. Se envio consulta
de seguimiento a Mapbox sobre descubrimiento de campos y almacenamiento permitido; respuesta
pendiente. Decision: mantener esta version en staging, sin revertirla ni tocar Production
hasta valorar la respuesta. No se modificaron ubicaciones historicas. Evidencia en MASTER.

- **Funcionalidad y móvil aceptados para beta:** se conserva la aceptación Preview de 11 escenarios postpartido y 35 avisos entregados. Hoy se aceptaron iPhone/Safari, recuperación, Explore/GPS, check-in/cámara, permisos denegados, campos sin zoom y navegación horizontal corregida (`e33ec54`). La precisión en un campo real de Londres sigue pendiente de feedback.
- **Correos y operación:** recordatorios temporizados entregados y cancelaciones verificadas en Preview. Cron de correos automático en Production observado con 200; cron diario ejecutado manualmente con 200. Regla 5xx guardada, pero sin entrega de alertas porque el propietario rechazó Observability Plus de pago; Sentry no añadido.
- **Infraestructura:** Vercel/Supabase Pro activos; protección contra contraseñas filtradas habilitada; RLS, Auth, Storage y separación Production/Preview revisados. Backups diarios de DB sin fotos; no se probó restauración. Se acepta no contratar PITR ni copia externa de fotos durante esta beta.
- **Privacidad/soporte:** textos actualizados y publicados, retención por finalidad y revisión mensual, solicitudes manuales por email y soporte sin SLA. Ensayo Preview de acceso/borrado verificado y sus fixtures eliminadas. Investigación contractual/legal documentada, no certificada.
- **Producción:** candidata con 174 tests, lint, build/TypeScript y auditoría de dependencias de producción sin vulnerabilidades. Promoción `db46d98`; seguimiento publicado en `1f04ad6` y despliegue READY. Registro/confirmación, perfil y recuperación reales; contraseña antigua y enlaces reutilizados rechazados. Reserva gratis/RLS probados en transacción revertida. Cuenta QA/sesiones eliminadas y ausencia comprobada; sin pendientes QA de Storage/outbox. Plantillas Auth actualizadas y localhost retirado.
- **Cuentas y limpieza de staging:** propietario confirmó las dos cuentas personales de Production y el nuevo admin de staging. Limpieza completa autorizada y verificada: solo quedan admin `matchkeeperuk+staging@gmail.com`, jugador `lorenzomeolav32@gmail.com` y portero aprobado `lorenzomeolav@hotmail.com`. Eliminadas otras 16 cuentas y todo el historial de pruebas; conservados perfiles, contraseñas y tres fotos. Outbox vacío tras reconciliar Resend; evidencia QA conservada en los informes, no en filas de Preview. Production no se modificó durante la limpieza.
- **Pendiente local de mantenimiento:** revisar la configuración de la credencial service-role de Preview, que devolvió 401. Se completó la limpieza por dashboard autenticado, sin rotar secretos; no se ha establecido un problema de Production.
- **Mejora móvil posterior al lanzamiento:** corregido el recorte derecho del paso 2 de “Post a match” en `8b3c399`, desplegado READY en staging. La cuadrícula y los fieldsets ya se ajustan al ancho disponible; etiquetas pueden saltar de línea. Build/TypeScript, lint focalizado y comprobaciones del formulario publicado entre 320 y 1440 px correctos, sin publicar partidos. Propietario confirmó que funciona en el móvil real y autorizó promoción: merge `72cd893` enviado a `main`, con árbol idéntico al probado en staging y sin incluir cambios locales ajenos.
- **Siguiente comprobación:** observar el cron diario automático el **27 de octubre a las 06:00 UTC**, sin confundirlo con el Run manual. No hay comprobación futura ejecutándose en segundo plano.
- **Pendientes continuos:** soporte/aprobaciones/reportes, logs y correos fallidos, uso/costes, derechos y revisión mensual de retención (próxima antes del 26 de noviembre). Resolver licencia/almacenamiento/facturación de Mapbox y cuestiones de contacto/territorio/contratos/transferencias/cookies; el lanzamiento no las resuelve. Restauración, rotación general de credenciales y precisión GPS real no verificadas. Borrado autoservicio, alertas de pago y pagos/suscripciones son decisiones futuras.

La mejora móvil está publicada en Production: despliegue `dpl_41dFvbVhERcdduCdMqDBhi2TsfjW` READY para `72cd893`, con alias público verificado. Home/login responden 200 y publicar partido sigue requiriendo sesión. No se crearon partidos de prueba en Production.

El orden completo y las evidencias están en el [seguimiento diario vigente](design-system/matchkeeper/MASTER.md#daily-handoff-and-remaining-order-2026-10-26) y el [runbook de privacidad y operaciones](docs/privacy-support-operations.md). La decisión del propietario de lanzar sin revisión profesional no equivale a cumplimiento legal verificado.

## 1. Visión

"Every match deserves a real keeper." MatchKeeper conecta a jugadores/equipos
que publican un partido con porteros cercanos que aplican. En la Beta, el equipo
elige y acuerda el pago directamente con el portero; no se paga dentro de la app.
El booking protegido describe una versión posterior y separada.

## 2. Usuarios y roles

| Rol | Qué es | Puede hacer |
|---|---|---|
| **Jugador** | Cuenta base de cualquier usuario que necesita un portero | Publicar partidos, ver aplicantes, elegir portero, chatear, calificar, ver historial |
| **Equipo** | Perfil opcional que un Jugador puede crear/administrar (agrupa un roster fijo, no es un tipo de cuenta separado) | Todo lo del Jugador + gestionar miembros/roster + publicar partidos "como equipo" |
| **Portero (arquero)** | Cuenta freelance revisada manualmente | Ver partidos disponibles cerca, aplicar con su tarifa, gestionar su calendario, chatear y acumular reseñas e historial; durante la Beta acuerda el pago directamente con el equipo |
| **Admin** | Staff de MatchKeeper | Aprobar/rechazar porteros nuevos, moderar reseñas/disputas, gestionar cancelaciones y reembolsos manuales, ver métricas |

**Nota de diseño clave**: no hay una cuenta "Equipo" separada de "Jugador".
Cualquier jugador puede reservar un portero para un partido informal con
amigos, o crear un perfil de Equipo para partidos recurrentes con roster fijo.
Esto simplifica el modelo de permisos (2 tipos reales de cuenta: Jugador y
Portero, más Admin interno).

## 3. Modelo de negocio

Este modelo corresponde únicamente a la versión **Booking protegido** y no se aplica a la Beta gratuita, que no cobra dinero. No hay un modelo de suscripción aprobado.

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
5. **Booking:** en la Beta, elegir keeper confirma la reserva y el pago se
  acuerda directamente entre ambas partes. En Booking protegido, el equipo paga
  con Stripe al elegir; la reserva queda pendiente hasta la confirmación del pago.
6. **Chat**: chat 1:1 por candidatura. El equipo puede abrirlo con cualquier
   candidato antes de aceptar, y el portero responde después, con controles contra
   la fuga de datos de contacto y el spam. Tras aceptar, sigue con el elegido para
   coordinar detalles (llegar más temprano, cambios de última hora, etc.). Detalle
   en `design-system/matchkeeper/MASTER.md`, ítem 12.
7. **Día del partido**: ambos ya tienen la info y ubicación en su calendario.
8. **Check-in y confirmación:** el portero toca "I have arrived" al llegar al
  campo y, si quiere, añade una foto de dónde espera para que el equipo lo encuentre
  (opcional, privada, se borra a los 120 días). El equipo confirma o reporta durante los 3 días siguientes al fin del
  partido. Si nadie reporta y hubo check-in, en Beta se cierra la reserva; en
  Booking protegido se inicia la transferencia automática según
  `PAYMENTS_SPEC.md`.
9. **Transferencia (solo Booking protegido):** al confirmarse, MatchKeeper
  transfiere la parte del portero a su cuenta Connect. No existe transferencia
  desde la plataforma en Beta.
10. **Reseña y contador**: el jugador puede calificar al portero
    (equipo/jugador → portero, no bidireccional en el MVP). El partido se
    suma automáticamente al contador de "partidos jugados" del portero.

## 5. Pagos — Stripe Connect (Booking protegido, inactivo)

Esta sección especifica una versión futura. En la Beta no hay cargos, fee ni transferencias a través de MatchKeeper.

- **Cuentas Connect Express** para los porteros (onboarding de Stripe ya
  incluye KYC básico requerido para poder cobrar — reduce carga legal propia).
- **Patrón "Separate Charges and Transfers"**: Stripe procesa el cargo al jugador
  al elegir al portero; el saldo queda en la cuenta de plataforma hasta que se
  dispara una **Transfer** explícita a la
  Connected Account del portero tras la confirmación del partido (paso 9 del
  flujo). La comisión es lo que no se transfiere. No se usa
  `application_fee_amount`, que es de otros tipos de cargo.
- No se presenta como servicio de escrow separado. Con este patrón el cliente transacciona con la plataforma: los contracargos
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

Nota 2: el sitio publicado refleja la Beta gratuita. El booking protegido es una versión posterior, construida pero desactivada. No mezclar el roadmap histórico por fases con el estado del lanzamiento actual.

**Estado a 2026-10-14:** el core de Beta y el flujo pagado están implementados; el flujo pagado se probó en sandbox, no con dinero real. `MASTER.md` contiene los gates actuales de staging y los pasos manuales. No se promueve a `main` hasta superarlos.

**Fase 1 — Core (base de la Beta gratuita)**
- Cuentas (Jugador / Portero), perfiles, perfil de Equipo opcional.
- Publicar partido, feed de partidos por radio, aplicar, seleccionar aplicante.
- Calendario personal con partidos confirmados.
- Mapa (según rol, logueado).
- Chat 1:1 jugador↔portero.
- Aprobación manual de porteros por Admin.

**Fase 2 — Booking protegido** *(construida y probada en sandbox; desactivada durante la Beta)*
- Stripe Connect Express (onboarding porteros) + pago con retención.
- Confirmación de partido jugado (auto + manual) y liberación de pago.
- Política de cancelación + strikes.
- Reseñas + contador de partidos jugados.
- **Hecho el 2026-10-08:** historial de pagos en `/payments`: el portero ve lo ganado,
  lo retenido y cada partido con sus cancelaciones y descuentos (con CSV mensual); el
  equipo ve lo pagado con desglose y lo reembolsado. Pendiente: recibo descargable de
  Stripe para el equipo (ver `PAYMENTS_SPEC.md`, sección 12.1).

**Fase 3 — Crecimiento (posible post-Beta; separada de las versiones anteriores)**
- Disponibilidad configurable del portero, integración calendario externo.
- Posibles suscripciones premium o partnerships para porteros, solo después de validar demanda y aprobar una especificación separada. No hay oferta actual.
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

- **Alcance:** unos meses, objetivo inicial de 20-50 usuarios en Londres, registro público solo para mayores de 18, porteros aprobados a mano y etiqueta de beta en la web.
- **Incluye:** cuentas, publicar partido, candidaturas, elección por el equipo, chat,
  calendario, mapa, check-in, reseñas y strikes.
- **No incluye:** cobro con tarjeta, comisión del 15 %, pagos a porteros, historial de
  pagos. La tarifa del portero es orientativa y se acuerda fuera de la app. MatchKeeper
  no cobra nada ni como depósito, comisión o propina.
- **Decisión confirmada:** durante la beta el equipo elige entre las candidaturas. El modo "el primero que aplica se queda" no está incluido.
- **Implementación:** `payments_enabled=false` por defecto; una fila ausente equivale a Beta gratis. Errores de lectura o valores inválidos bloquean reservas. Las reservas sin cobro llevan `payment_status='none'`. El código de pagos se conserva para activarlo posteriormente.
- **Pruebas base (2026-10-13):** el modo gratis y el flujo de Stripe sandbox se probaron con sesiones reales antes de esta revisión. Este trabajo añade fail-closed en TypeScript/SQL y actualiza el orden de scripts; estos cambios siguen locales, sin aplicar en Supabase Preview ni desplegar en Vercel. No activar pagos durante el lanzamiento de Beta.
- **Métricas a medir:** partidos publicados, % cubiertos, tiempo hasta la primera
  candidatura, repetición a 30 días, no-shows y cuántos usuarios piden protección de
  pago. Los umbrales de éxito se fijan antes de abrir la beta.
- **Hoja de ruta tras la beta:** (1) "booking protegido" opcional con cargo Stripe,
  transferencia post-partido, reembolso por no-show y comisión del 15 % (ya construido);
  (2) suscripciones con
  extras (ver candidatos ordenados, perfil destacado) solo si la demanda es clara. Las
  suscripciones no son la base del negocio.
- **Gate antes de invitar usuarios:** aprobación de Terms/Privacy/Safety por un solicitor y asesor de privacidad; confirmar base legal, calendario de retención, proveedores/transferencias internacionales, alcance GDPR/UK GDPR y cualquier requisito de representante/ICO; revisar Online Safety Act con asesor cualificado. El operador vive en Bélgica: un contable belga debe confirmar los requisitos de actividad/impuestos para una Beta gratuita. La forma jurídica y la estructura para pagos deben resolverse antes de activar Booking protegido.
