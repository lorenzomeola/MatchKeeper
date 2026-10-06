// Check-in del portero y plazo de respuesta del equipo (PAYMENTS_SPEC.md §6 y §7). Sin dependencias.

export type Coords = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distancia en metros entre dos puntos (haversine). */
export function distanceMeters(a: Coords, b: Coords): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export type CheckInCheck = { ok: true } | { ok: false; reason: "too_early" | "too_late" | "too_far" };

/** Permitido de `windowMin` minutos antes a `windowMin` después del inicio, y a menos de `radiusM` del campo. */
export function checkInAllowed(input: {
  now: Date;
  startsAt: Date;
  distanceM: number;
  windowMin: number;
  radiusM: number;
}): CheckInCheck {
  const offsetMin = (input.now.getTime() - input.startsAt.getTime()) / 60_000;
  if (offsetMin < -input.windowMin) return { ok: false, reason: "too_early" };
  if (offsetMin > input.windowMin) return { ok: false, reason: "too_late" };
  if (input.distanceM > input.radiusM) return { ok: false, reason: "too_far" };
  return { ok: true };
}

/** El equipo responde desde el inicio del partido hasta la liberación automática. */
export function teamCanRespond(now: Date, startsAt: Date, autoReleaseAt: Date): boolean {
  return now >= startsAt && now < autoReleaseAt;
}
