// Qué hacer con una reserva confirmada una vez pasado el partido (PAYMENTS_SPEC.md §7).

export type TeamResponse = "confirmed" | "reported_no_show" | "reported_other" | null;

export type ReleaseDecision = "release" | "wait" | "under_review" | "refund_with_strike";

export function decideRelease(input: {
  checkedIn: boolean;
  teamResponse: TeamResponse;
  now: Date;
  autoReleaseAt: Date;
}): ReleaseDecision {
  const { checkedIn, teamResponse, now, autoReleaseAt } = input;

  if (teamResponse === "confirmed") return "release";
  if (teamResponse === "reported_other") return "under_review";
  if (teamResponse === "reported_no_show") {
    // Sin check-in no hay prueba de que fuera: reembolso total y strike. Con check-in decide un admin.
    return checkedIn ? "under_review" : "refund_with_strike";
  }

  if (now < autoReleaseAt) return "wait";
  // Silencio del equipo: solo se libera solo si el portero hizo check-in.
  return checkedIn ? "release" : "under_review";
}
