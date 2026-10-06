// Estado de pagos de un portero a partir de su cuenta conectada (PAYMENTS_SPEC.md §3).

export type RecipientSnapshot = {
  transfersStatus?: string;
  payoutsStatus?: string;
  // undefined = no se pidió `requirements` a Stripe, no se puede afirmar que esté completo.
  outstandingRequirements?: number;
};

export function deriveKeeperPaymentState(s: RecipientSnapshot) {
  return {
    // `payouts` no se puede pedir en cuentas recipient, solo leer: se bloquea si Stripe lo restringe o rechaza.
    payoutsEnabled: s.transfersStatus === "active" && s.payoutsStatus !== "restricted" && s.payoutsStatus !== "rejected",
    onboardingComplete: s.outstandingRequirements === 0,
  };
}
