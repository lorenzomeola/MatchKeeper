"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type AuthActionState } from "@/lib/actions/auth";
import { FormError, PasswordField, SubmitButton } from "@/components/platform/form-fields";

const initialState: AuthActionState = { error: null };

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <div>
      <p className="pl-eyebrow">Password</p>
      <h1 className="pl-display mt-3 text-fg [font-size:var(--t-4xl)]">Choose a new password</h1>
      <p className="pl-prose mt-3 [font-size:var(--t-base)]">
        You will be logged in once it is saved.
      </p>

      <form action={formAction} className="mt-8 grid grid-cols-1 gap-5">
        {state.error && (
          <FormError>
            {state.error}{" "}
            <Link href="/forgot-password" className="pl-focus font-semibold underline underline-offset-4">
              Request a new link
            </Link>
          </FormError>
        )}

        <PasswordField label="New password" hint="At least 8 characters." autoComplete="new-password" minLength={8} />

        <div className="pt-1">
          <SubmitButton pending={pending} pendingLabel="Saving…">
            Save password
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
