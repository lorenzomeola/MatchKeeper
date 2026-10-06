// Reglas de strikes de los porteros. La misma regla vive en db/strikes.sql (keeper_strike_points): si cambia una, cambia la otra.

export type StrikeKind = "no_show" | "late_cancel";

/** Puntos y cuánto tiempo cuenta cada tipo de strike. */
export const STRIKE_RULES: Record<StrikeKind, { points: number; windowDays: number }> = {
  no_show: { points: 3, windowDays: 365 },
  late_cancel: { points: 1, windowDays: 90 },
};

export const REVIEW_POINTS = 2;
export const SUSPENSION_POINTS = 3;
/** Con tantos no-shows vigentes el admin ve al portero como candidato a retirada definitiva. */
export const REMOVAL_CANDIDATE_NO_SHOWS = 2;

export type StrikeInput = { kind: string | null; createdAt: Date; waivedAt: Date | null };

export type StandingLevel = "good" | "warned" | "review" | "suspended";

const DAY_MS = 86_400_000;

// Un strike antiguo sin tipo se trata como cancelación tardía.
function kindOf(kind: string | null): StrikeKind {
  return kind === "no_show" ? "no_show" : "late_cancel";
}

export function isActiveStrike(s: StrikeInput, now: Date): boolean {
  if (s.waivedAt) return false;
  const rule = STRIKE_RULES[kindOf(s.kind)];
  return now.getTime() - s.createdAt.getTime() < rule.windowDays * DAY_MS;
}

export function keeperStanding(strikes: StrikeInput[], now: Date) {
  const active = strikes.filter((s) => isActiveStrike(s, now));
  const points = active.reduce((sum, s) => sum + STRIKE_RULES[kindOf(s.kind)].points, 0);
  const noShows = active.filter((s) => kindOf(s.kind) === "no_show").length;
  const level: StandingLevel =
    points >= SUSPENSION_POINTS ? "suspended" : points >= REVIEW_POINTS ? "review" : points >= 1 ? "warned" : "good";
  return { points, level, noShows, removalCandidate: noShows >= REMOVAL_CANDIDATE_NO_SHOWS };
}
