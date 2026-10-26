"use client";

import { useActionState, useId, useState } from "react";
import dynamic from "next/dynamic";
import { DateTile, MatchChips } from "@/components/app/match-card";
import { LevelPicker } from "@/components/app/level-picker";
import { CtaAction } from "@/components/platform/cta-button";
import { Field, FormError, RequirementTag, SelectField, SubmitButton, TextField } from "@/components/platform/form-fields";
import { createMatchAction, type MatchActionState } from "@/lib/actions/matches";
import { londonLocalToIso, timeRange, todayLondon } from "@/lib/format";
import { searchPlaces, type Place } from "@/lib/geocode";
import { FORMAT_OPTIONS, NOTES_MAX, SURFACE_OPTIONS } from "@/lib/match-options";
import { DURATION_OPTIONS, durationText, rangeText, recommendedRange, suggestedBudget } from "@/lib/pricing";
import { AGE_FROM_OPTIONS, AGE_TO_OPTIONS } from "@/lib/profile";
import { KEEPER_OPTIONS } from "@/lib/slots";

const MapPicker = dynamic(() => import("@/components/map-picker"), {
  ssr: false,
  loading: () => <div className="pl-skeleton h-60 w-full sm:h-72" />,
});

const initialState: MatchActionState = { error: null };

// Centro de Londres: punto de partida del mapa.
const LONDON = { lat: 51.5074, lng: -0.1278 };

type Values = {
  date: string;
  startTime: string;
  duration: string;
  address: string;
  format: string;
  surface: string;
  level: string;
  keepers: string;
  budget: string;
  prefAgeMin: string;
  prefAgeMax: string;
  notes: string;
};

type Errors = Partial<Record<keyof Values, string>>;

const NOT_LOCATED = "Search for the pitch and choose it from the list, or place the pin on the map.";

const STEP_ONE: (keyof Values)[] = ["date", "startTime", "duration", "address"];

function validateStepOne(v: Values, today: string): Errors {
  const e: Errors = {};
  if (!v.date) e.date = "Pick a date.";
  else if (v.date < today) e.date = "That date has already passed.";
  if (!v.startTime) e.startTime = "Pick a start time.";
  if (!v.duration) e.duration = "Choose how long the match lasts.";
  if (!v.address.trim()) e.address = "Add the pitch name or address.";
  return e;
}

export function NewMatchForm({ initialDate = "" }: { initialDate?: string }) {
  const [state, formAction, pending] = useActionState(createMatchAction, initialState);
  const [today] = useState(todayLondon);
  const [placeholderIso] = useState(() => new Date().toISOString());
  const [step, setStep] = useState<1 | 2>(1);
  const [v, setV] = useState<Values>({
    date: initialDate,
    startTime: "19:00",
    duration: "60",
    address: "",
    format: "",
    surface: "",
    level: "",
    keepers: "1",
    budget: "",
    prefAgeMin: "",
    prefAgeMax: "",
    notes: "",
  });
  const [pos, setPos] = useState(LONDON);
  // El presupuesto sigue a formato y duración hasta que el jugador lo edita.
  const [budgetTouched, setBudgetTouched] = useState(false);
  // La ubicación solo cuenta como puesta si salió de un resultado de búsqueda o el usuario movió el pin.
  const [placed, setPlaced] = useState<{ by: "search" | "map"; label: string } | null>(null);
  const addressId = useId();
  const [errors, setErrors] = useState<Errors>({});
  const [finding, setFinding] = useState(false);
  const [findNote, setFindNote] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [searched, setSearched] = useState(false);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setV((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const server = state.fieldErrors ?? {};
  const err = (k: keyof Values) => errors[k] ?? server[k as keyof typeof server];
  const serverStepOne = STEP_ONE.some((k) => server[k as keyof typeof server]);

  function goNext() {
    const e = validateStepOne(v, today);
    if (!e.address && !placed) e.address = NOT_LOCATED;
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(2);
    else if (e.address === NOT_LOCATED && !finding && !searched) void findOnMap();
  }

  function onAddressChange(value: string) {
    set("address", value);
    // Si el texto cambia tras elegir un resultado, la ubicación ya no corresponde: hay que buscar de nuevo.
    if (placed?.by === "search" && value.trim() !== placed.label) setPlaced(null);
  }

  function onPinMoved(lat: number, lng: number) {
    setPos({ lat, lng });
    setPlaced((prev) => ({ by: "map", label: prev?.label ?? "" }));
    setErrors((prev) => (prev.address === NOT_LOCATED ? { ...prev, address: undefined } : prev));
  }

  async function findOnMap() {
    const q = v.address.trim();
    if (!q) {
      setErrors((p) => ({ ...p, address: "Type the pitch name or address first." }));
      return;
    }
    setFinding(true);
    setFindNote(null);
    setPlaces([]);
    setSearched(false);
    try {
      const found = await searchPlaces(q);
      setPlaces(found);
      setSearched(true);
    } catch {
      setFindNote("The search failed. Tap the map to drop the pin yourself.");
    } finally {
      setFinding(false);
    }
  }

  function pickPlace(p: Place) {
    setPos({ lat: p.lat, lng: p.lng });
    set("address", p.label);
    setPlaced({ by: "search", label: p.label });
    setPlaces([]);
    setSearched(false);
    setFindNote("Pin placed. Drag it if it is not on the exact pitch.");
  }

  const minutes = Number(v.duration);
  const formatNum = v.format ? Number(v.format) : null;
  const range = recommendedRange(formatNum, minutes);
  const autoBudget = suggestedBudget(formatNum, minutes);
  const budget = budgetTouched ? v.budget : autoBudget != null ? String(autoBudget) : "";

  const startIso = v.date && v.startTime ? londonLocalToIso(`${v.date}T${v.startTime}`) : null;
  const endIso = startIso && minutes > 0 ? new Date(Date.parse(startIso) + minutes * 60_000).toISOString() : null;
  const timeText = startIso && endIso ? timeRange(startIso, endIso) : "Date and time to be set";
  const preview = {
    id: "preview",
    starts_at: startIso ?? placeholderIso,
    ends_at: endIso ?? placeholderIso,
    address: v.address.trim() || null,
    level: v.level || null,
    format: v.format ? Number(v.format) : null,
    surface: v.surface || null,
    budget_suggested: budget || null,
    keepers_needed: Number(v.keepers),
    pref_age_min: v.prefAgeMin || null,
    pref_age_max: v.prefAgeMax || null,
  };

  return (
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] xl:gap-14">
      <form
        action={formAction}
        noValidate
        onSubmit={(e) => {
          if (step === 1) {
            e.preventDefault();
            goNext();
            return;
          }
          const e1 = validateStepOne(v, today);
          if (!e1.address && !placed) e1.address = NOT_LOCATED;
          const e2: Errors = {};
          if (!v.format) e2.format = "Choose the format.";
          if (!v.surface) e2.surface = "Choose the surface.";
          const all = { ...e1, ...e2 };
          if (Object.keys(all).length > 0) {
            e.preventDefault();
            setErrors(all);
            if (Object.keys(e1).length > 0) setStep(1);
          }
        }}
        className="grid min-w-0 grid-cols-1 gap-7"
      >
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="pl-eyebrow">Step {step} of 2</p>
            <p className="text-sm font-medium text-fg-2">{step === 1 ? "When and where" : "The match"}</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2" aria-hidden>
            <div className="h-1 rounded-full bg-accent" />
            <div className={`h-1 rounded-full transition-colors duration-300 ${step === 2 ? "bg-accent" : "bg-surface-2"}`} />
          </div>
        </div>

        {state.error && step === 2 && (
          <FormError>
            {state.error}
            {serverStepOne && (
              <>
                {" "}
                <button type="button" onClick={() => setStep(1)} className="font-semibold underline underline-offset-4">
                  Go back to step 1
                </button>
              </>
            )}
          </FormError>
        )}

        <input type="hidden" name="lat" value={pos.lat} />
        <input type="hidden" name="lng" value={pos.lng} />

        {/* Los dos pasos permanecen montados para que ambos viajen en el formulario. */}
        <div className={step === 1 ? "grid grid-cols-1 gap-6" : "hidden"}>
          <TextField
            label="Date"
            name="date"
            type="date"
            min={today}
            value={v.date}
            onChange={(e) => set("date", e.target.value)}
            error={err("date")}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Starts"
              name="startTime"
              type="time"
              step={300}
              value={v.startTime}
              onChange={(e) => set("startTime", e.target.value)}
              error={err("startTime")}
            />
            <SelectField
              label="Duration"
              name="duration"
              placeholder="Choose"
              options={DURATION_OPTIONS}
              value={v.duration}
              onChange={(e) => set("duration", e.target.value)}
              error={err("duration")}
            />
          </div>
          <div className="grid gap-3">
            <Field
              label="Pitch name or address"
              htmlFor={addressId}
              error={err("address")}
              hint="Search it, then pick the right place from the list."
            >
              <div className="flex gap-2">
                <input
                  id={addressId}
                  name="address"
                  type="text"
                  autoComplete="off"
                  placeholder="Hackney Marshes, London"
                  className="pl-input min-w-0 flex-1"
                  value={v.address}
                  onChange={(e) => onAddressChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void findOnMap();
                    }
                  }}
                  aria-invalid={err("address") ? true : undefined}
                  aria-describedby={err("address") ? `${addressId}-error` : `${addressId}-hint`}
                />
                <button
                  type="button"
                  onClick={findOnMap}
                  disabled={finding}
                  className="pl-focus inline-flex min-h-12 shrink-0 items-center rounded-[var(--r-md)] bg-accent px-5 text-sm font-semibold text-accent-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
                >
                  {finding ? "Searching…" : "Search"}
                </button>
              </div>
            </Field>
            {places.length > 0 && (
              <ul className="pl-surface divide-y divide-line overflow-hidden rounded-[var(--r-md)]" aria-label="Matching places">
                {places.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => pickPlace(p)}
                      className="flex min-h-14 w-full flex-col justify-center px-4 py-2 text-left transition-colors duration-200 hover:bg-surface-2"
                    >
                      <span className="truncate text-[15px] font-medium text-fg">{p.name}</span>
                      <span className="truncate text-[13px] text-muted">{p.detail}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {searched && (
              <div className="rounded-[var(--r-md)] border border-line bg-surface px-4 py-3 text-[13px] leading-relaxed text-muted">
                <p className="font-semibold text-fg">
                  {places.length === 0 ? "We couldn't find that pitch." : "Not the pitch you meant?"}
                </p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-5">
                  <li>Search the street or the postcode instead of the pitch name.</li>
                  <li>Or tap the map where the pitch is, or drag the pin onto it.</li>
                  <li>Keep the pitch name in the field above, so keepers know which pitch it is.</li>
                </ol>
              </div>
            )}
            {findNote && <p className="text-[13px] text-muted">{findNote}</p>}
          </div>
          <div>
            <MapPicker lat={pos.lat} lng={pos.lng} onChange={onPinMoved} />
            <p className="mt-2 text-[13px] text-muted">
              Tap the map or drag the pin to the exact pitch. Keepers see this location.
            </p>
          </div>
          <CtaAction type="button" onClick={goNext} className="-mx-[7px] w-[calc(100%+14px)]">
            Continue
          </CtaAction>
        </div>

        <div className={step === 2 ? "grid min-w-0 grid-cols-1 gap-6" : "hidden"}>
          <div className="flex items-center gap-4 rounded-[var(--r-lg)] border border-line bg-surface p-4 xl:hidden">
            <DateTile iso={preview.starts_at} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-fg">{preview.address ?? "Pitch to be confirmed"}</p>
              <p className="text-sm text-muted">{timeText}</p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-accent-strong"
            >
              Edit
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <SelectField
              label="Format"
              name="format"
              placeholder="Choose"
              options={FORMAT_OPTIONS}
              value={v.format}
              onChange={(e) => set("format", e.target.value)}
              error={err("format")}
            />
            <SelectField
              label="Surface"
              name="surface"
              placeholder="Choose"
              options={SURFACE_OPTIONS}
              value={v.surface}
              onChange={(e) => set("surface", e.target.value)}
              error={err("surface")}
            />
          </div>

          <LevelPicker
            label="Level of the match"
            intro="Pick the standard this match usually is."
            value={v.level}
            onChange={(l) => set("level", l)}
            tag="recommended"
          />

          <fieldset className="grid min-w-0 gap-2.5">
            <legend className="mb-1 flex w-full flex-wrap items-baseline justify-between gap-2 text-sm font-medium text-fg-2">
              Preferred keeper age
              <RequirementTag tag="optional" />
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="From"
                name="prefAgeMin"
                placeholder="No minimum"
                options={AGE_FROM_OPTIONS}
                value={v.prefAgeMin}
                onChange={(e) => set("prefAgeMin", e.target.value)}
              />
              <SelectField
                label="To"
                name="prefAgeMax"
                placeholder="No maximum"
                options={AGE_TO_OPTIONS}
                value={v.prefAgeMax}
                onChange={(e) => set("prefAgeMax", e.target.value)}
                error={err("prefAgeMax")}
              />
            </div>
            <p className="text-[13px] text-muted">Just a preference. Keepers of any age can still apply.</p>
          </fieldset>

          <SelectField
            label="Keepers needed"
            name="keepers"
            placeholder="Choose"
            options={KEEPER_OPTIONS}
            value={v.keepers}
            onChange={(e) => set("keepers", e.target.value)}
            error={err("keepers")}
            hint={v.keepers === "2" ? "Each keeper applies, is booked and is paid separately." : undefined}
          />

          <TextField
            label={v.keepers === "2" ? "Suggested budget per keeper (£)" : "Suggested budget (£)"}
            name="budget"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.5"
            placeholder="30"
            tag="optional"
            hint={
              range
                ? `Usual for ${durationText(minutes)} of ${v.format}-a-side: ${rangeText(range)}. Keepers still apply with their own rate.`
                : "What you expect to pay. Keepers still apply with their own rate."
            }
            value={budget}
            onChange={(e) => {
              setBudgetTouched(true);
              set("budget", e.target.value);
            }}
            error={err("budget")}
          />

          <Field
            label="Notes for the keeper"
            htmlFor="match-notes"
            tag="optional"
            error={err("notes")}
            hint="Parking, kit colour, how to find the pitch."
          >
            <textarea
              id="match-notes"
              name="notes"
              maxLength={NOTES_MAX}
              className="pl-input"
              value={v.notes}
              onChange={(e) => set("notes", e.target.value)}
              aria-describedby="match-notes-hint"
            />
            <span className="pl-tnum text-right text-xs text-muted">
              {v.notes.length}/{NOTES_MAX}
            </span>
          </Field>

          <div className="grid gap-3">
            <SubmitButton pending={pending} pendingLabel="Posting…">
              Post match
            </SubmitButton>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-muted underline underline-offset-4 hover:text-fg"
            >
              Back to step 1
            </button>
          </div>
        </div>
      </form>

      <aside className="hidden xl:block" aria-label="Preview">
        <div className="sticky top-10">
          <p className="pl-eyebrow">How keepers see it</p>
          <div className="pl-surface mt-4 rounded-[var(--r-lg)] p-4">
            <div className="flex items-start gap-4">
              <DateTile iso={preview.starts_at} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-fg">{preview.address ?? "Pitch to be confirmed"}</p>
                <p className="mt-0.5 text-sm text-muted">{timeText}</p>
                <MatchChips match={preview} />
              </div>
            </div>
          </div>
          <p className="pl-prose mt-4 max-w-[26rem] text-[15px]">
            Keepers nearby see this card, then apply with their own rate. You compare them and pick one.
          </p>
        </div>
      </aside>
    </div>
  );
}
