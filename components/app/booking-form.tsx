"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/platform/form-fields";
import { startCheckoutAction, type BookingActionState } from "@/lib/actions/bookings";

const initialState: BookingActionState = { error: null };

export function BookingForm({ applicationId, total }: { applicationId: string; total: string }) {
  const [state, formAction, pending] = useActionState(startCheckoutAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      {state.error && <FormError>{state.error}</FormError>}

      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-relaxed text-fg-2">
        <input type="checkbox" name="terms" className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]" />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="font-semibold text-accent-strong underline underline-offset-4">
            Terms of Service
          </Link>{" "}
          and the cancellation policy above.
        </span>
      </label>

      <SubmitButton pending={pending} pendingLabel="Opening payment…">
        {`Pay ${total}`}
      </SubmitButton>
    </form>
  );
}
