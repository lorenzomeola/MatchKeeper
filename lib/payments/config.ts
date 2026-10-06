// Comisión de MatchKeeper (% sobre la tarifa del portero) y versión de los Términos que acepta el equipo al reservar.
export const COMMISSION_PCT = 15;
export const TERMS_VERSION = "2026-10-06";

// Stripe exige entre 30 minutos y 24 horas; el margen evita rechazos por latencia.
export const CHECKOUT_TTL_MINUTES = 31;

// Check-in del portero (PAYMENTS_SPEC.md §6): campos grandes y GPS impreciso justifican 200 m.
export const CHECKIN_RADIUS_M = 200;
export const CHECKIN_WINDOW_MIN = 30;

// Texto que se envía al banco como política de cancelación mostrada al equipo antes de pagar. Debe coincidir con los Términos, cláusula 4.
export const CANCELLATION_POLICY_TEXT = [
  "Cancellation policy shown to the team before payment and accepted with the Terms:",
  "- Team cancels more than 24 hours before kick-off: full refund.",
  "- Team cancels between 24 and 2 hours before kick-off: 50% is charged, 50% is refunded.",
  "- Team cancels less than 2 hours before kick-off, or does not show up: 100% is charged and the goalkeeper is paid in full.",
  "- Goalkeeper cancels or does not show up: the team is refunded in full.",
  "After the match the team has three days to confirm it or report a problem. If nobody responds and the goalkeeper checked in at the pitch, the payment is released to the goalkeeper.",
].join("\n");
