"use client";

import { useActionState, useState, useTransition } from "react";
import { Sheet } from "@/components/app/sheet";
import { useToast } from "@/components/app/toast";
import { Field, FormError, SubmitButton } from "@/components/platform/form-fields";
import { applyToMatchAction, withdrawApplicationAction, type ApplicationActionState } from "@/lib/actions/applications";
import { money } from "@/lib/format";

const initialState: ApplicationActionState = { error: null };

/** Formulario del portero para aplicar con su propia tarifa. */
export function ApplyCard({ matchId, budget }: { matchId: string; budget: string | number | null }) {
  const [state, formAction, pending] = useActionState(applyToMatchAction, initialState);
  const suggested = money(budget);

  return (
    <form action={formAction} noValidate className="pl-surface grid gap-5 rounded-[var(--r-xl)] p-5 sm:p-6">
      <div>
        <p className="pl-display text-fg [font-size:var(--t-xl)]">Apply to this match</p>
        <p className="pl-prose mt-1.5 text-[15px]">
          Set the rate you want for this game. The team compares keepers and picks one.
        </p>
      </div>

      <input type="hidden" name="matchId" value={matchId} />
      {state.error && <FormError>{state.error}</FormError>}

      <Field
        label="Your rate (£)"
        htmlFor="apply-rate"
        hint={suggested ? `The team suggested ${suggested}. Your rate can be higher or lower.` : undefined}
      >
        <input
          id="apply-rate"
          name="rate"
          type="number"
          inputMode="decimal"
          min={1}
          step="0.5"
          placeholder="25"
          className="pl-input"
          autoComplete="off"
        />
      </Field>

      <Field label="Message to the team" htmlFor="apply-message" tag="optional" hint="Where you play, what you bring, anything that helps them choose.">
        <textarea id="apply-message" name="message" maxLength={300} className="pl-input" />
      </Field>

      <SubmitButton pending={pending} pendingLabel="Sending…">
        Send application
      </SubmitButton>
    </form>
  );
}

/** Retirar una aplicación pendiente, con confirmación. */
export function WithdrawButton({ applicationId, matchId }: { applicationId: string; matchId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function withdraw() {
    startTransition(async () => {
      const res = await withdrawApplicationAction(applicationId, matchId);
      if (res.error) {
        toast(res.error, "error");
        return;
      }
      setOpen(false);
      toast("Application withdrawn.");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline underline-offset-4 transition-colors duration-200 hover:text-fg"
      >
        Withdraw application
      </button>
      <Sheet open={open} title="Withdraw your application?" onClose={() => !pending && setOpen(false)}>
        <p className="pl-prose text-[15px]">The team will no longer see you as an option for this match.</p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={withdraw}
            disabled={pending}
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] bg-danger px-5 text-[15px] font-semibold text-accent-ink transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? "Withdrawing…" : "Withdraw"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] px-5 text-[15px] font-medium text-fg-2"
          >
            Keep it
          </button>
        </div>
      </Sheet>
    </>
  );
}
