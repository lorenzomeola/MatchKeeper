// Rangos orientativos de tarifa por portero. No limitan lo que el portero puede pedir.

export const DURATIONS = [60, 90, 120] as const;
export type Duration = (typeof DURATIONS)[number];

export const DURATION_OPTIONS = [
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
];

export type PriceRange = { min: number; max: number };

type Block = "small" | "mid" | "large";

// Valores de partida sin datos de mercado: ajustar con las primeras candidaturas reales.
const RANGES: Record<Block, Record<Duration, PriceRange>> = {
  small: { 60: { min: 15, max: 30 }, 90: { min: 20, max: 35 }, 120: { min: 25, max: 40 } },
  mid: { 60: { min: 25, max: 35 }, 90: { min: 30, max: 40 }, 120: { min: 35, max: 45 } },
  large: { 60: { min: 30, max: 40 }, 90: { min: 35, max: 45 }, 120: { min: 40, max: 50 } },
};

export function isDuration(minutes: number): minutes is Duration {
  return (DURATIONS as readonly number[]).includes(minutes);
}

function blockOf(format: number | null | undefined): Block | null {
  if (format == null) return null;
  if (format >= 5 && format <= 6) return "small";
  if (format >= 7 && format <= 8) return "mid";
  if (format >= 9 && format <= 11) return "large";
  return null;
}

export function matchMinutes(startsAt: string, endsAt: string) {
  return Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000);
}

/** Rango recomendado, o null si el formato o la duración no tienen rango (p. ej. partidos antiguos de otra duración). */
export function recommendedRange(format: number | null | undefined, minutes: number): PriceRange | null {
  const block = blockOf(format);
  if (!block || !isDuration(minutes)) return null;
  return RANGES[block][minutes];
}

/** Punto medio del rango, en libras enteras. */
export function suggestedBudget(format: number | null | undefined, minutes: number): number | null {
  const r = recommendedRange(format, minutes);
  return r ? Math.round((r.min + r.max) / 2) : null;
}

export function rangeText(r: PriceRange) {
  return `£${r.min} to £${r.max}`;
}

export function durationText(minutes: number) {
  if (minutes === 60) return "1 hour";
  if (minutes === 90) return "1.5 hours";
  if (minutes === 120) return "2 hours";
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hours`;
}

/** Forma corta para chips: "1 h", "1.5 h", "2 h". */
export function durationShort(minutes: number) {
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
}

export function rateVsRange(rate: number, r: PriceRange): "below" | "within" | "above" {
  if (rate < r.min) return "below";
  if (rate > r.max) return "above";
  return "within";
}
