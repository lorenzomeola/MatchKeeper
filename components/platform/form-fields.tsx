"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { CtaAction } from "@/components/platform/cta-button";
import { ChevronDownIcon } from "@/components/platform/icons";

export type FieldTag = "required" | "recommended" | "optional";

const TAG_STYLE: Record<FieldTag, { label: string; className: string }> = {
  required: { label: "Required", className: "font-semibold text-accent-strong" },
  recommended: { label: "Recommended", className: "font-medium text-fg-2" },
  optional: { label: "Optional", className: "font-normal text-muted" },
};

export function RequirementTag({ tag }: { tag: FieldTag }) {
  const { label, className } = TAG_STYLE[tag];
  return <span className={`text-xs ${className}`}>{label}</span>;
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-[var(--r-md)] border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-fg"
    >
      {children}
    </p>
  );
}

export function SubmitButton({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}) {
  return (
    <CtaAction type="submit" disabled={pending} className="-mx-[7px] w-[calc(100%+14px)]">
      {pending ? pendingLabel : children}
    </CtaAction>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  tag,
  aside,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  /** Etiqueta explícita de obligatoriedad; tiene prioridad sobre `optional`. */
  tag?: FieldTag;
  /** Elemento a la derecha de la etiqueta (p. ej. un enlace). Fuera del <label>. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const shownTag = tag ?? (optional ? "optional" : undefined);
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-fg-2">
          {label}
        </label>
        {aside ?? (shownTag && <RequirementTag tag={shownTag} />)}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="text-[13px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  tag?: FieldTag;
};

export function TextField({ label, hint, error, optional, tag, name, ...props }: TextFieldProps) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} optional={optional} tag={tag}>
      <input
        id={id}
        name={name}
        className="pl-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
    </Field>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "className" | "children"> & {
  label: string;
  hint?: string;
  error?: string;
  tag?: FieldTag;
  placeholder: string;
  options: readonly { value: string; label: string; disabled?: boolean }[];
};

export function SelectField({ label, hint, error, tag, placeholder, options, ...props }: SelectFieldProps) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} tag={tag}>
      <div className="relative">
        <select
          id={id}
          className="pl-input min-w-0 appearance-none pr-11"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </Field>
  );
}

export function PasswordField({
  label = "Password",
  hint,
  aside,
  autoComplete,
  minLength,
}: {
  label?: string;
  hint?: string;
  aside?: ReactNode;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label} htmlFor={id} hint={hint} aside={aside}>
      <div className="relative">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="pl-input pr-20"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="pl-focus absolute inset-y-1 right-1 rounded-[var(--r-sm)] px-3 text-[13px] font-semibold text-fg-2 transition-colors duration-200 hover:text-fg"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </Field>
  );
}
