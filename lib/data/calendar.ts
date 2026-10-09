import { loadKeeperGames, loadPlayerMatches } from "@/lib/data/matches";
import { londonDay } from "@/lib/format";
import { keeperNames } from "@/lib/slots";

export type CalKind = "booked" | "partial" | "open" | "waiting" | "played";

export type CalEvent = {
  id: string;
  matchId: string;
  startsAt: string;
  endsAt: string;
  day: string;
  address: string;
  kind: CalKind;
  sub: string;
  /** Plazas ocupadas de un partido de 2 porteros, p. ej. "1/2". */
  slots?: string;
};

const ev = (
  id: string,
  m: { id: string; starts_at: string; ends_at: string; address: string | null },
  kind: CalKind,
  sub: string,
  slots?: string,
): CalEvent => ({
  id,
  matchId: m.id,
  startsAt: m.starts_at,
  endsAt: m.ends_at,
  day: londonDay(m.starts_at),
  address: m.address ?? "Pitch to be confirmed",
  kind,
  sub,
  slots,
});

/** Todo lo que el usuario tiene en agenda, a partir de los mismos datos que la lista de partidos. */
export async function loadCalendarEvents(userId: string, isKeeper: boolean): Promise<CalEvent[]> {
  if (isKeeper) {
    const t = await loadKeeperGames(userId);
    return [
      ...t.booked.map((i) => ev(i.application.id, i.match, "booked", i.poster)),
      ...t.open.map((i) => ev(i.application.id, i.match, "waiting", `Waiting for ${i.poster}`)),
      ...t.past
        .filter((i) => i.application.status === "accepted" && i.match.status !== "cancelled")
        .map((i) => ev(i.application.id, i.match, "played", i.poster)),
    ];
  }
  const t = await loadPlayerMatches(userId);
  const withKeepers = (i: { keepers: { name: string }[] }, none: string) =>
    i.keepers.length > 0 ? `${i.keepers.length > 1 ? "Keepers" : "Keeper"}: ${keeperNames(i.keepers.map((k) => k.name))}` : none;
  // Solo los partidos de 2 porteros llevan la cuenta de plazas.
  const slotsOf = (i: { match: { keepers_needed: number }; keepers: unknown[] }) =>
    i.match.keepers_needed > 1 ? `${i.keepers.length}/${i.match.keepers_needed}` : undefined;
  return [
    ...t.booked.map((i) => ev(i.match.id, i.match, "booked", withKeepers(i, "Keeper booked"), slotsOf(i))),
    ...t.open.map((i) => {
      const applied = i.pending > 0 ? `${i.pending} ${i.pending === 1 ? "keeper" : "keepers"} applied` : "No applications yet";
      const missing = i.match.keepers_needed - i.keepers.length;
      if (i.keepers.length > 0) {
        // Con algún portero pero plazas libres: se distingue del partido completo.
        return ev(i.match.id, i.match, "partial", `${withKeepers(i, "")}. Still needs ${missing} more. ${applied}`, slotsOf(i));
      }
      return ev(
        i.match.id,
        i.match,
        "open",
        i.match.keepers_needed > 1 ? `Needs ${i.match.keepers_needed} keepers. ${applied}` : i.pending > 0 ? applied : "Looking for a keeper",
        slotsOf(i),
      );
    }),
    ...t.past
      .filter((i) => i.match.status === "assigned" || i.match.status === "completed" || (i.match.status === "open" && i.keepers.length > 0))
      .map((i) => ev(i.match.id, i.match, "played", withKeepers(i, "Played"), slotsOf(i))),
  ];
}
