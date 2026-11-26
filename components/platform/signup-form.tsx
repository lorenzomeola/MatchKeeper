"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionState } from "@/lib/actions/auth";
import { FormError, PasswordField, SelectField, SubmitButton, TextField } from "@/components/platform/form-fields";
import { ArrowRightIcon, ChatIcon } from "@/components/platform/icons";
import { CATEGORIES, CATEGORY_COPY, CITY_OPTIONS, DEFAULT_CITY, type Category, type Role } from "@/lib/profile";

const initialState: AuthActionState = { error: null };

const COPY: Record<
  Role,
  {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    nameLabel: string;
    nameHint?: string;
    note: string;
    switchPrompt: string;
    switchLabel: string;
    switchHref: string;
    afterEmail: string;
  }
> = {
  player: {
    eyebrow: "Players and teams",
    title: "Find a goalkeeper",
    body: "Create your account, then add your team and post your first match.",
    cta: "Create account",
    nameLabel: "Your name",
    note: "Posting a match is free.",
    switchPrompt: "Are you a goalkeeper?",
    switchLabel: "Join as a goalkeeper",
    switchHref: "/signup/goalkeeper",
    afterEmail: "Once it is confirmed you can set up your team and post a match.",
  },
  goalkeeper: {
    eyebrow: "Goalkeepers",
    title: "Join as a goalkeeper",
    body: "Create your account, then build your profile. A person reviews it before you can apply to matches.",
    cta: "Create goalkeeper account",
    nameLabel: "Full name",
    nameHint: "Teams see this on your profile.",
    note: "Free to join.",
    switchPrompt: "Looking for a goalkeeper instead?",
    switchLabel: "Sign up as a player or team",
    switchHref: "/signup/player",
    afterEmail: "Once it is confirmed you can build your profile: photo, bio and experience.",
  },
};

export function SignupForm({ role, initialCategory = null }: { role: Role; initialCategory?: Category | null }) {
  const copy = COPY[role];
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  const [category, setCategory] = useState<Category | null>(initialCategory);

  if (state.checkEmail) {
    return (
      <div role="status">
        <span className="grid h-12 w-12 place-items-center rounded-[var(--r-md)] bg-accent-soft text-accent">
          <ChatIcon className="h-6 w-6" />
        </span>
        <h1 className="pl-display mt-6 text-fg [font-size:var(--t-4xl)]">Check your email</h1>
        <p className="pl-prose mt-3 [font-size:var(--t-base)]">
          We sent a confirmation link to{" "}
          <strong className="font-semibold text-fg">{state.values?.email}</strong>. {copy.afterEmail}
        </p>
        <p className="mt-6 text-sm text-muted">
          Nothing after a few minutes? Check your spam folder. Already confirmed?{" "}
          <Link href="/login" className="pl-focus font-semibold text-accent-strong underline underline-offset-4">
            Log in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="pl-eyebrow">{copy.eyebrow}</p>
      <h1 className="pl-display mt-3 text-fg [font-size:var(--t-4xl)]">{copy.title}</h1>
      <p className="pl-prose mt-3 [font-size:var(--t-base)]">{copy.body}</p>

      {!category ? (
        <div className="mt-8">
          <p className="text-sm font-medium text-fg-2">
            {role === "goalkeeper" ? "First, which football do you keep goal in?" : "First, which football do you play?"}
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-3">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => setCategory(c)}
                  className="pl-focus pl-lift group flex w-full items-center gap-4 rounded-[var(--r-xl)] border border-line bg-surface p-5 text-left shadow-[var(--shadow-2),var(--ring-inset)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="pl-display block text-fg [font-size:var(--t-xl)]">{CATEGORY_COPY[role][c].title}</span>
                    <span className="mt-1 block text-sm text-muted">{CATEGORY_COPY[role][c].body}</span>
                  </span>
                  <ArrowRightIcon className="h-5 w-5 shrink-0 text-muted transition-[transform,color] duration-200 group-hover:translate-x-1 group-hover:text-accent" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
      <form action={formAction} className="mt-8 grid grid-cols-1 gap-5">
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="category" value={category} />

        <p className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-accent/40 bg-accent-soft px-4 py-2.5 text-sm">
          <span className="font-semibold text-fg">{CATEGORY_COPY[role][category].title}</span>
          <button
            type="button"
            onClick={() => setCategory(null)}
            className="pl-focus inline-flex min-h-11 items-center font-semibold text-accent-strong underline underline-offset-4"
          >
            Change
          </button>
        </p>

        {state.error && <FormError>{state.error}</FormError>}

        <TextField
          label={copy.nameLabel}
          hint={copy.nameHint}
          name="displayName"
          type="text"
          required
          autoComplete="name"
          defaultValue={state.values?.displayName}
        />
        <SelectField
          label="City"
          name="city"
          required
          autoComplete="address-level2"
          placeholder="Select your city"
          options={CITY_OPTIONS}
          hint="We are live in London. More cities coming soon."
          defaultValue={state.values?.city || DEFAULT_CITY}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.values?.email}
        />
        <TextField
          label="Mobile number"
          hint={
            role === "goalkeeper"
              ? "UK mobile. Only MatchKeeper sees it, to reach you about bookings."
              : "Optional. UK mobile, only MatchKeeper sees it, in case something changes on match day."
          }
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required={role === "goalkeeper"}
          placeholder="07700 900123"
          defaultValue={state.values?.phone}
        />
        {role === "goalkeeper" && (
          <TextField
            label="Instagram (optional)"
            hint="Only the MatchKeeper team sees it, to verify your profile. Players and teams never see it."
            name="instagram"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            placeholder="@yourhandle"
            defaultValue={state.values?.instagram}
          />
        )}
        <PasswordField
          label="Password"
          hint="At least 8 characters."
          autoComplete="new-password"
          minLength={8}
        />

        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-relaxed text-fg-2">
          <input type="checkbox" name="over18" required className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]" />
          <span>I am 18 or over. MatchKeeper is for adult football only.</span>
        </label>

        <div className="grid grid-cols-1 gap-3 pt-1">
          <SubmitButton pending={pending} pendingLabel="Creating account…">
            {copy.cta}
          </SubmitButton>
          <p className="text-center text-[13px] text-muted">
            {copy.note} By continuing you agree to our{" "}
            <Link href="/terms" className="pl-focus underline underline-offset-2 hover:text-fg">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="pl-focus underline underline-offset-2 hover:text-fg">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </form>
      )}

      <div className="mt-8 grid gap-1 border-t border-line pt-4 text-sm text-muted">
        <p className="flex flex-wrap items-center gap-x-1.5">
          Already have an account?
          <Link href="/login" className="pl-focus inline-flex min-h-11 items-center font-semibold text-accent-strong underline underline-offset-4">
            Log in
          </Link>
        </p>
        <p className="flex flex-wrap items-center gap-x-1.5">
          {copy.switchPrompt}
          <Link href={copy.switchHref} className="pl-focus inline-flex min-h-11 items-center font-semibold text-accent-strong underline underline-offset-4">
            {copy.switchLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
