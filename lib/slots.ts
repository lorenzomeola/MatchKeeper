// Plazas de porteros de un partido (1 o 2). Un partido con plazas libres sigue "open".

export const KEEPER_OPTIONS = [
  { value: "1", label: "1 keeper" },
  { value: "2", label: "2 keepers" },
];

export const MAX_KEEPERS = 2;

export function isKeepersNeeded(n: number): n is 1 | 2 {
  return n === 1 || n === 2;
}

/** Candidaturas aceptadas: con el partido vivo equivalen a las reservas vigentes. */
export function bookedCount(applications: { status: string }[]) {
  return applications.filter((a) => a.status === "accepted").length;
}

/** "1 of 2 booked"; null si el partido solo necesita uno. */
export function slotsLabel(needed: number | null | undefined, booked: number) {
  if (!needed || needed < 2) return null;
  return `${booked} of ${needed} booked`;
}

/** Nombres de los porteros reservados: "Sam", "Sam and Alex". */
export function keeperNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
