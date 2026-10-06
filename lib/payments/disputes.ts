// Reglas puras de disputas y contracargos (PAYMENTS_SPEC.md §8). Sin Stripe ni base de datos, para poder probarlas.

export type DisputeFault = "keeper" | "platform" | "unclear";
export const DISPUTE_FAULTS: DisputeFault[] = ["keeper", "platform", "unclear"];

/** Estados de Stripe en los que todavía se puede responder. */
export const RESPONDABLE_STATUSES = ["needs_response", "warning_needs_response"];

/** Avisos de la fecha límite de la evidencia: "urgent" a menos de 72 horas. */
export type DueState = "none" | "ok" | "urgent" | "overdue";

export function dueState(dueBy: Date | null, now: Date): DueState {
  if (!dueBy) return "none";
  const ms = dueBy.getTime() - now.getTime();
  if (ms <= 0) return "overdue";
  return ms < 72 * 3_600_000 ? "urgent" : "ok";
}

/** Lo que aún se puede revertir de una transferencia al portero. */
export function reversibleAmount(transferPence: number, reversedPence: number): number {
  return Math.max(0, transferPence - reversedPence);
}

/** Lo que se le devuelve al portero cuando se gana una disputa: lo revertido más lo que ya se le descontó de otros pagos. */
export function retransferAmount(input: { reversedPence: number; debtRecoveredPence: number }): number {
  return Math.max(0, input.reversedPence) + Math.max(0, input.debtRecoveredPence);
}

/** Disputas sobre reservas cobradas, en %. Las redes de tarjetas se preocupan hacia el 1%. */
export function disputeRatioPct(disputes: number, paidBookings: number): number {
  if (paidBookings <= 0) return 0;
  return Math.round((disputes / paidBookings) * 10_000) / 100;
}

/** Si el admin puede enviar la evidencia ahora, y si no por qué. */
export function evidenceSubmitBlock(input: {
  status: string;
  dueBy: Date | null;
  submittedAt: Date | null;
  hasEvidence: boolean;
  now: Date;
}): string | null {
  if (!RESPONDABLE_STATUSES.includes(input.status)) return "This dispute is no longer waiting for a response.";
  if (input.submittedAt) return "The evidence was already sent.";
  if (!input.hasEvidence) return "There is no evidence to send yet.";
  if (input.dueBy && input.dueBy.getTime() <= input.now.getTime()) return "The deadline has passed.";
  return null;
}
