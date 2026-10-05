"use client";

import { InfoTip } from "@/components/platform/info-tip";
import { RequirementTag, type FieldTag } from "@/components/platform/form-fields";
import { LEVELS, LEVEL_INFO } from "@/lib/profile";

/** Selector de nivel con el botón (i) que explica cada opción. Es controlado y envía `name` en el formulario. */
export function LevelPicker({
  name = "level",
  label,
  intro,
  value,
  onChange,
  tag = "optional",
}: {
  name?: string;
  label: string;
  intro: string;
  value: string;
  onChange: (level: string) => void;
  tag?: FieldTag;
}) {
  return (
    <fieldset className="relative grid gap-2.5">
      <legend className="mb-1 flex w-full items-center justify-between text-sm font-medium text-fg-2">
        <span className="flex items-center gap-2">
          {label}
          <InfoTip label="What do the levels mean?">
            <span className="block font-semibold text-fg">{intro}</span>
            {LEVELS.map((l) => (
              <span key={l} className="mt-2 block">
                <span className="font-semibold text-accent-strong">{l}: </span>
                {LEVEL_INFO[l]}
              </span>
            ))}
          </InfoTip>
        </span>
        <RequirementTag tag={tag} />
      </legend>
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <span key={l}>
            <input
              type="radio"
              name={name}
              value={l}
              id={`${name}-${l}`}
              className="sr-only"
              checked={value === l}
              onChange={() => onChange(l)}
            />
            <label htmlFor={`${name}-${l}`} className="pl-chip">
              {l}
            </label>
          </span>
        ))}
      </div>
    </fieldset>
  );
}
