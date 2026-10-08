"use client";

import { useActionState } from "react";
import { CtaAction } from "@/components/platform/cta-button";
import { FormError } from "@/components/platform/form-fields";
import { openStripeDashboardAction, type PaymentSetupState } from "@/lib/actions/stripe-connect";

const initialState: PaymentSetupState = { error: null };

/** Abre el panel de Stripe del portero: el enlace se genera al pulsar porque es de un solo uso. */
export function StripeDashboardButton() {
  const [state, formAction, pending] = useActionState(openStripeDashboardAction, initialState);
  return (
    <form action={formAction} className="grid justify-items-start gap-3">
      {state.error && <FormError>{state.error}</FormError>}
      <CtaAction type="submit" variant="secondary" size="md" disabled={pending}>
        {pending ? "Opening Stripe…" : "Open my Stripe dashboard"}
      </CtaAction>
    </form>
  );
}
