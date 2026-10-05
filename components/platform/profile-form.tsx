"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { saveProfileAction, type ProfileActionState } from "@/lib/actions/profile";
import {
  BIO_MAX,
  CITY_OPTIONS,
  DETAILED_BIO_MIN,
  KEEPER_BIO_MIN,
  LEVELS,
  LEVEL_INFO,
  PLAYER_KINDS,
  PLAYER_KIND_COPY,
  completeness,
  profileChecklist,
  type ProfileValues,
  type Role,
} from "@/lib/profile";
import { AvatarUpload } from "@/components/platform/avatar-upload";
import {
  Field,
  FormError,
  RequirementTag,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/platform/form-fields";
import { CheckIcon } from "@/components/platform/icons";
import { InfoTip } from "@/components/platform/info-tip";

const initialState: ProfileActionState = { error: null };

export function ProfileForm({
  role,
  userId,
  initial,
  inShell = false,
}: {
  role: Role;
  userId: string;
  initial: ProfileValues;
  /** Dentro del shell de la app: la barra de avance se pega bajo la barra superior y no hay "Skip". */
  inShell?: boolean;
}) {
  const isKeeper = role === "goalkeeper";
  const [state, formAction, pending] = useActionState(saveProfileAction, initialState);
  const [v, setV] = useState<ProfileValues>(initial);
  const isTeam = !isKeeper && v.playerKind === "team";
  const set = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  const items = profileChecklist(role, v);
  const { percent, tier, nextStep } = completeness(items);
  const required = items.filter((i) => i.required);
  const recommended = items.filter((i) => !i.required);
  const fe = state.fieldErrors ?? {};

  const bioId = useId();
  const initials =
    v.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "MK";

  return (
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-14">
      {/* Móvil: el resumen completo queda al final, así que el avance se ve siempre arriba. */}
      <div
        aria-hidden
        className={`sticky z-30 -mx-5 -mb-4 flex items-center gap-4 border-b border-line bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] px-5 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8 xl:hidden ${
          inShell ? "top-[calc(3.75rem+env(safe-area-inset-top,0px))]" : "top-0"
        }`}
      >
        <p className="pl-tnum w-10 text-sm font-semibold text-fg">{percent}%</p>
        <div className="pl-meter flex-1">
          <div className="pl-meter__fill" style={{ "--pct": percent / 100 } as React.CSSProperties} />
        </div>
        <p className="w-16 text-right text-sm font-medium text-fg-2">{tier}</p>
      </div>

      <form action={formAction} className="grid grid-cols-1 gap-8" noValidate>
        {state.error && <FormError>{state.error}</FormError>}

        <ul className="grid gap-2 rounded-[var(--r-md)] border border-line bg-surface px-4 py-3 text-[13px] text-muted">
          <li className="flex items-center gap-3">
            <span className="w-24 shrink-0">
              <RequirementTag tag="required" />
            </span>
            Needed to finish your profile.
          </li>
          <li className="flex items-center gap-3">
            <span className="w-24 shrink-0">
              <RequirementTag tag="recommended" />
            </span>
            Raises your profile rating.
          </li>
          <li className="flex items-center gap-3">
            <span className="w-24 shrink-0">
              <RequirementTag tag="optional" />
            </span>
            Extra, only if you want.
          </li>
        </ul>

        <input type="hidden" name="avatarUrl" value={v.avatarUrl} />

        {!isKeeper && (
          <fieldset className="grid gap-2.5">
            <legend className="mb-1 flex w-full items-baseline justify-between text-sm font-medium text-fg-2">
              Who is this account for?
              <RequirementTag tag="required" />
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {PLAYER_KINDS.map((k) => (
                <label
                  key={k}
                  className="flex cursor-pointer flex-col gap-1 rounded-[var(--r-xl)] border border-line-strong bg-surface p-4 transition-colors duration-200 hover:border-accent/60 has-[input:checked]:border-accent has-[input:checked]:bg-accent-soft has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--accent)]"
                >
                  <input
                    type="radio"
                    name="playerKind"
                    value={k}
                    className="sr-only"
                    checked={v.playerKind === k}
                    onChange={() => set("playerKind", k)}
                  />
                  <span className="text-sm font-semibold text-fg">{PLAYER_KIND_COPY[k].title}</span>
                  <span className="text-[13px] leading-snug text-muted">{PLAYER_KIND_COPY[k].body}</span>
                </label>
              ))}
            </div>
            {fe.playerKind && <p className="text-[13px] text-danger">{fe.playerKind}</p>}
          </fieldset>
        )}

        <AvatarUpload
          userId={userId}
          value={v.avatarUrl}
          initials={initials}
          label={isKeeper ? "Profile photo" : isTeam ? "Team photo or crest" : "Group photo"}
          tag={isKeeper ? "required" : "recommended"}
          hint={
            isKeeper
              ? "A clear photo of you. Teams see it before they pick. JPEG, PNG or WebP, up to 5 MB."
              : "JPEG, PNG or WebP, up to 5 MB."
          }
          error={fe.avatarUrl}
          onChange={(url) => set("avatarUrl", url)}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Your name"
            name="displayName"
            tag="required"
            required
            autoComplete="name"
            value={v.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            error={fe.displayName}
          />
          <SelectField
            label="City"
            name="city"
            tag="required"
            required
            autoComplete="address-level2"
            placeholder="Select your city"
            options={CITY_OPTIONS}
            value={v.city}
            onChange={(e) => set("city", e.target.value)}
            error={fe.city}
            hint="More cities coming soon."
          />
        </div>

        {isTeam && (
          <TextField
            label="Team name"
            name="teamName"
            tag="required"
            required
            placeholder="Hackney Marshes FC"
            value={v.teamName}
            onChange={(e) => set("teamName", e.target.value)}
            error={fe.teamName}
            hint="Keepers see this when you post a match."
          />
        )}

        <fieldset className="relative grid gap-2.5">
          <legend className="mb-1 flex w-full items-center justify-between text-sm font-medium text-fg-2">
            <span className="flex items-center gap-2">
              {isKeeper ? "Level you play at" : "Usual level of your matches"}
              <InfoTip label="What do the levels mean?">
                <span className="block font-semibold text-fg">
                  {isKeeper ? "Pick the standard you are comfortable keeping at." : "Pick the standard your matches usually are."}
                </span>
                {LEVELS.map((l) => (
                  <span key={l} className="mt-2 block">
                    <span className="font-semibold text-accent-strong">{l}: </span>
                    {LEVEL_INFO[l]}
                  </span>
                ))}
              </InfoTip>
            </span>
            <RequirementTag tag="recommended" />
          </legend>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <span key={l}>
                <input
                  type="radio"
                  name="level"
                  value={l}
                  id={`level-${l}`}
                  className="sr-only"
                  checked={v.level === l}
                  onChange={() => set("level", l)}
                />
                <label htmlFor={`level-${l}`} className="pl-chip">
                  {l}
                </label>
              </span>
            ))}
          </div>
        </fieldset>

        {isKeeper && (
          <TextField
            label="Years as a goalkeeper"
            name="experienceYears"
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            step={1}
            placeholder="6"
            value={v.experienceYears}
            onChange={(e) => set("experienceYears", e.target.value)}
            error={fe.experienceYears}
            tag="recommended"
          />
        )}

        <Field
          label={isKeeper ? "Bio" : isTeam ? "About your team" : "About your group"}
          htmlFor={bioId}
          tag={isKeeper ? "required" : "recommended"}
          error={fe.bio}
          hint={
            isKeeper
              ? `Where you have played, your strengths, how you like to work. At least ${KEEPER_BIO_MIN} characters, ${DETAILED_BIO_MIN}+ rates higher.`
              : "Pitch details, kit colour, how the group likes to play."
          }
        >
          <textarea
            id={bioId}
            name="bio"
            className="pl-input"
            maxLength={BIO_MAX}
            value={v.bio}
            onChange={(e) => set("bio", e.target.value)}
            aria-invalid={fe.bio ? true : undefined}
            aria-describedby={fe.bio ? `${bioId}-error` : `${bioId}-hint`}
          />
          <span className="pl-tnum text-right text-xs text-muted">
            {v.bio.length}/{BIO_MAX}
          </span>
        </Field>

        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          {inShell ? (
            <span />
          ) : (
            <Link href="/dashboard" className="pl-focus inline-flex min-h-11 items-center justify-center text-sm font-medium text-muted underline underline-offset-4 hover:text-fg">
              Skip for now
            </Link>
          )}
          <div className="sm:w-60">
            <SubmitButton pending={pending} pendingLabel="Saving…">
              Save profile
            </SubmitButton>
          </div>
        </div>
      </form>

      <aside className="xl:sticky xl:top-8 xl:self-start" aria-label="Profile rating">
        <div className="pl-surface p-6">
          <p className="pl-eyebrow">Profile rating</p>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <p className="pl-display text-fg [font-size:var(--t-2xl)]">{tier}</p>
            <p className="pl-display pl-tnum text-fg [font-size:var(--t-3xl)]">{percent}%</p>
          </div>
          <div
            className="pl-meter mt-4"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile rating"
          >
            <div className="pl-meter__fill" style={{ "--pct": percent / 100 } as React.CSSProperties} />
          </div>

          <ChecklistGroup title="Required" items={required} />
          <ChecklistGroup title="Recommended" items={recommended} showWeight />

          {nextStep && (
            <p className="mt-5 rounded-[var(--r-md)] bg-accent-soft px-4 py-3 text-[13px] leading-relaxed text-fg-2">
              <span className="font-semibold text-accent-strong">Next best step: </span>
              {nextStep.label.toLowerCase()} (+{nextStep.weight}%). {nextStep.tip}
            </p>
          )}

          <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
            {isKeeper
              ? "A person reviews your profile before you can apply to matches. Only the required items are needed for that. The rest helps teams choose you."
              : "You can post a match without finishing this. Keepers look for a city, a usual level and a few words about who they will play with."}
          </p>
        </div>
      </aside>
    </div>
  );
}

function ChecklistGroup({
  title,
  items,
  showWeight,
}: {
  title: string;
  items: ReturnType<typeof profileChecklist>;
  showWeight?: boolean;
}) {
  return (
    <div className="mt-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</p>
      <ul className="mt-3 grid gap-3">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-200 ${
                i.done ? "border-transparent bg-accent text-accent-ink" : "border-line-strong text-transparent"
              }`}
            >
              <CheckIcon className="h-3 w-3" />
            </span>
            <span className={i.done ? "text-fg-2" : "text-fg"}>
              {i.label}
              <span className="sr-only">{i.done ? ", done" : ", missing"}</span>
            </span>
            {showWeight && (
              <span className="pl-tnum ml-auto text-xs text-muted">+{i.weight}%</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
