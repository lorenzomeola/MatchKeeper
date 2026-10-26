// Cálculo de importes y reglas de cancelación (PAYMENTS_SPEC.md §2 y §5).
// Todo en enteros de peniques y sin dependencias, para poder probarlo con `npm test`.

export type CancelActor = "team" | "keeper";

export type Totals = {
  ratePence: number;
  platformFeePence: number;
  totalPence: number;
};

export type CancellationOutcome = {
  chargePct: 0 | 50 | 100;
  keeperSharePence: number;
  feeSharePence: number;
  chargedPence: number;
  refundPence: number;
  strike: boolean;
};

function assertPence(value: number, name: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer number of pence`);
  }
}

export function calculateTotals(ratePence: number, commissionPct: number): Totals {
  assertPence(ratePence, "ratePence");
  const platformFeePence = Math.round((ratePence * commissionPct) / 100);
  return { ratePence, platformFeePence, totalPence: ratePence + platformFeePence };
}

// Parte cobrada cuando solo se cobra un porcentaje de la tarifa; la comisión se aplica a esa parte.
export function partialCharge(ratePence: number, commissionPct: number, chargePct: number) {
  const { totalPence } = calculateTotals(ratePence, commissionPct);
  const keeperSharePence = Math.round((ratePence * chargePct) / 100);
  const feeSharePence = Math.round((keeperSharePence * commissionPct) / 100);
  const chargedPence = keeperSharePence + feeSharePence;
  return {
    keeperSharePence,
    feeSharePence,
    chargedPence,
    refundPence: totalPence - chargedPence,
  };
}

export function hoursBeforeStart(startsAt: Date, now: Date): number {
  return (startsAt.getTime() - now.getTime()) / 3_600_000;
}

// Si equipo y portero cancelan en la misma ventana, aplica quien cancela primero (decisión 8 de la spec).
export function cancellationOutcome(
  ratePence: number,
  commissionPct: number,
  actor: CancelActor,
  hoursBefore: number,
): CancellationOutcome {
  if (actor === "keeper") {
    // El equipo siempre recupera todo; el strike depende de lo tarde que cancele el portero.
    return { chargePct: 0, ...partialCharge(ratePence, commissionPct, 0), strike: hoursBefore <= 24 };
  }
  const chargePct = hoursBefore > 24 ? 0 : hoursBefore > 2 ? 50 : 100;
  return { chargePct, ...partialCharge(ratePence, commissionPct, chargePct), strike: false };
}

export type CancellationPlan = CancellationOutcome & {
  strikeKind: "late_cancel" | "no_show" | null;
  // Si el portero cancela con tiempo se reabre el partido para otros candidatos (decisión 3 de la spec).
  matchAfter: "open" | "cancelled";
};

export function cancellationPlan(
  ratePence: number,
  commissionPct: number,
  actor: CancelActor,
  hoursBefore: number,
): CancellationPlan {
  const outcome = cancellationOutcome(ratePence, commissionPct, actor, hoursBefore);
  return {
    ...outcome,
    strikeKind: outcome.strike ? "late_cancel" : null,
    matchAfter: actor === "keeper" && hoursBefore > 2 ? "open" : "cancelled",
  };
}

/** El portero no se presentó: reembolso total al equipo y strike. El partido ya empezó, no se reabre. */
export function noShowPlan(ratePence: number, commissionPct: number): CancellationPlan {
  return {
    chargePct: 0,
    ...partialCharge(ratePence, commissionPct, 0),
    strike: true,
    strikeKind: "no_show",
    matchAfter: "cancelled",
  };
}

/** Reembolso total sin strike: decisión de un admin cuando nadie tiene la culpa. */
export function fullRefundPlan(ratePence: number, commissionPct: number): CancellationPlan {
  return {
    chargePct: 0,
    ...partialCharge(ratePence, commissionPct, 0),
    strike: false,
    strikeKind: null,
    matchAfter: "cancelled",
  };
}

/** El mismo plan sin importes: para reservas sin cobro (beta), donde solo cuentan el strike y el estado del partido. */
export function withoutMoney(plan: CancellationPlan): CancellationPlan {
  return { ...plan, chargePct: 0, keeperSharePence: 0, feeSharePence: 0, chargedPence: 0, refundPence: 0 };
}

/**
 * Trabajo de dinero que queda por hacer en una reserva cancelada. Permite reanudar tras un fallo a medias:
 * el estado se guarda antes de llamar a Stripe y esto deduce qué falta.
 */
export function cancellationWork(b: {
  ratePence: number;
  commissionPct: number;
  chargePct: number;
  paymentStatus: string;
  transferId: string | null;
  // Un pago que se quedó en cero por una deuda no tiene transferencia, pero ya se hizo.
  releasedAt?: string | null;
}) {
  const { refundPence, keeperSharePence } = partialCharge(b.ratePence, b.commissionPct, b.chargePct);
  return {
    refundPence,
    payoutPence: keeperSharePence,
    refundPending: refundPence > 0 && b.paymentStatus === "held",
    payoutPending: keeperSharePence > 0 && b.transferId === null && !b.releasedAt,
  };
}
