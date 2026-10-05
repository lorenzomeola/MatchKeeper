"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthActionState } from "@/lib/actions/auth";
import { FormError, PasswordField, SubmitButton, TextField } from "@/components/platform/form-fields";

const initialState: AuthActionState = { error: null };

export function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const message = state.error ?? notice;

  return (
    <div>
      <p className="pl-eyebrow">Log in</p>
      <h1 className="pl-display mt-3 text-fg [font-size:var(--t-4xl)]">Welcome back</h1>
      <p className="pl-prose mt-3 [font-size:var(--t-base)]">
        Log in to see your matches and applications.
      </p>

      <form action={formAction} className="mt-8 grid grid-cols-1 gap-5">
        {message && <FormError>{message}</FormError>}

        <TextField
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.values?.email}
        />
        <PasswordField
          autoComplete="current-password"
          aside={
            <Link
              href="/forgot-password"
              className="pl-focus -my-3 inline-flex min-h-11 items-center text-[13px] font-medium text-accent-strong underline underline-offset-4"
            >
              Forgot password?
            </Link>
          }
        />

        <div className="pt-1">
          <SubmitButton pending={pending} pendingLabel="Logging in…">
            Log in
          </SubmitButton>
        </div>
      </form>

      <p className="mt-6 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
        New to MatchKeeper?
        <Link href="/signup" className="pl-focus inline-flex min-h-11 items-center font-semibold text-accent-strong underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
