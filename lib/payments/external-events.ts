// Reglas puras de los webhooks que no pertenecen a un cobro ni a una disputa (PAYMENTS_SPEC.md 10).

/** Qué hacer con una reserva cuando Stripe avisa de un reembolso. Los de la app ya cancelan la reserva antes de reembolsar. */
export function refundOutsideApp(bookingStatus: string): "review" | "log" | "ignore" {
  if (bookingStatus === "confirmed") return "review";
  if (bookingStatus === "under_review" || bookingStatus === "completed") return "log";
  return "ignore";
}

export type PayoutProblem = { failedAt: Date; message: string | null } | null;

/**
 * Aviso de pago fallido al portero. Un `payout.paid` solo lo borra si es posterior al fallo, porque los
 * eventos pueden llegar desordenados; un fallo antiguo nunca pisa a uno más reciente.
 */
export function nextPayoutProblem(
  current: PayoutProblem,
  ev: { type: "payout.failed" | "payout.paid"; at: Date; message?: string | null },
): PayoutProblem {
  if (ev.type === "payout.failed") {
    if (current && current.failedAt.getTime() >= ev.at.getTime()) return current;
    return { failedAt: ev.at, message: ev.message ?? null };
  }
  if (!current) return null;
  return ev.at.getTime() > current.failedAt.getTime() ? null : current;
}
