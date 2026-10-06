"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/platform/form-fields";
import { startPaymentSetupAction, type PaymentSetupState } from "@/lib/actions/stripe-connect";

const initialState: PaymentSetupState = { error: null };

/** Lleva al portero al alta de pagos de Stripe. `resume` cambia el texto si ya empezó. */
export function PaymentSetupCard({ resume = false }: { resume?: boolean }) {
  const [state, formAction, pending] = useActionState(startPaymentSetupAction, initialState);

  return (
    <form action={formAction} className="pl-surface grid gap-4 rounded-[var(--r-xl)] p-5 sm:p-6">
      <div>
        <p className="pl-display text-fg [font-size:var(--t-xl)]">
          {resume ? "Finish setting up payments" : "Set up payments to start applying"}
        </p>
        <p className="pl-prose mt-1.5 text-[15px]">
          Stripe verifies your identity and your bank account so you get paid after each match. It takes a few minutes
          and MatchKeeper never sees your bank details.
        </p>
      </div>
      {state.error && <FormError>{state.error}</FormError>}
      <SubmitButton pending={pending} pendingLabel="Opening Stripe…">
        {resume ? "Continue setup" : "Set up payments"}
      </SubmitButton>
    </form>
  );
}
