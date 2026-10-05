"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type AuthActionState } from "@/lib/actions/auth";
import { FormError, SubmitButton, TextField } from "@/components/platform/form-fields";
import { ChatIcon } from "@/components/platform/icons";

const initialState: AuthActionState = { error: null };

export function ForgotPasswordForm({ notice }: { notice?: string }) {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  if (state.sent) {
    return (
      <div role="status">
        <span className="grid h-12 w-12 place-items-center rounded-[var(--r-md)] bg-accent-soft text-accent">
          <ChatIcon className="h-6 w-6" />
        </span>
        <h1 className="pl-display mt-6 text-fg [font-size:var(--t-4xl)]">Check your email</h1>
        <p className="pl-prose mt-3 [font-size:var(--t-base)]">
          If there is an account for{" "}
          <strong className="font-semibold text-fg">{state.values?.email}</strong>, we sent a link to
          reset the password. It can take a few minutes.
        </p>
        <p className="mt-6 text-sm text-muted">
          <Link href="/login" className="pl-focus font-semibold text-accent-strong underline underline-offset-4">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  const message = state.error ?? notice;

  return (
    <div>
      <p className="pl-eyebrow">Password</p>
      <h1 className="pl-display mt-3 text-fg [font-size:var(--t-4xl)]">Reset your password</h1>
      <p className="pl-prose mt-3 [font-size:var(--t-base)]">
        Enter the email you signed up with and we will send you a link.
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

        <div className="pt-1">
          <SubmitButton pending={pending} pendingLabel="Sending…">
            Send reset link
          </SubmitButton>
        </div>
      </form>

      <p className="mt-8 text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="pl-focus font-semibold text-accent-strong underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}
