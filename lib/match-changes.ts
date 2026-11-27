import { SURFACE_LABEL, longDate, money, splitAddress, timeRange } from "./format.ts";
import { isSamePlace } from "./match-duplicates.ts";

export type MatchSnapshot = {
  starts_at: string;
  ends_at: string;
  address: string | null;
  lat: number;
  lng: number;
  format: number | null;
  surface: string | null;
  level: string | null;
  budget_suggested: string | number | null;
  keepers_needed: number | null;
  pref_age_min: string | null;
  pref_age_max: string | null;
};

export type MatchChange = { field: "when" | "pitch" | "format" | "surface" | "level" | "budget" | "keepers" | "age"; label: string; from: string; to: string };

/** Qué tipo de aviso toca: subida de presupuesto, solo presupuesto u otros cambios. */
export type UpdateKind = "budget_up" | "budget" | "details";

const when = (m: MatchSnapshot) => `${longDate(m.starts_at)}, ${timeRange(m.starts_at, m.ends_at)}`;
const budget = (m: MatchSnapshot) => money(m.budget_suggested) ?? "not set";
const keepers = (m: MatchSnapshot) => ((m.keepers_needed ?? 1) === 2 ? "2 keepers" : "1 keeper");
const age = (m: MatchSnapshot) => {
  if (m.pref_age_min && m.pref_age_max) return `${m.pref_age_min} to ${m.pref_age_max}`;
  return m.pref_age_min ?? m.pref_age_max ?? "any age";
};
const level = (m: MatchSnapshot) => m.level ?? "not set";
const surface = (m: MatchSnapshot) => (m.surface ? (SURFACE_LABEL[m.surface] ?? m.surface) : "not set");
const format = (m: MatchSnapshot) => (m.format ? `${m.format}-a-side` : "not set");

/** Cambios que le importan a un portero (las notas no cuentan), en el orden en que se muestran. */
export function diffMatch(before: MatchSnapshot, after: MatchSnapshot): MatchChange[] {
  const out: MatchChange[] = [];
  const add = (field: MatchChange["field"], label: string, from: string, to: string) => {
    if (from !== to) out.push({ field, label, from, to });
  };

  add("when", "Date and time", when(before), when(after));
  const samePlace = isSamePlace(
    { address: before.address, lat: before.lat, lng: before.lng },
    { address: after.address, lat: after.lat, lng: after.lng },
  );
  if (!samePlace) out.push({ field: "pitch", label: "Pitch", from: splitAddress(before.address).name, to: splitAddress(after.address).name });
  add("format", "Format", format(before), format(after));
  add("surface", "Surface", surface(before), surface(after));
  add("level", "Level", level(before), level(after));
  add("keepers", "Keepers needed", keepers(before), keepers(after));
  add("age", "Keeper age", age(before), age(after));
  add("budget", "Budget", budget(before), budget(after));
  return out;
}

export function updateKind(changes: MatchChange[], before: MatchSnapshot, after: MatchSnapshot): UpdateKind {
  if (changes.length !== 1 || changes[0].field !== "budget") return "details";
  return Number(after.budget_suggested ?? 0) > Number(before.budget_suggested ?? 0) ? "budget_up" : "budget";
}

export const changeLine = (c: MatchChange) => `${c.label}: ${c.from} → ${c.to}`;
