import { loadKeeperGames, loadPlayerMatches } from "@/lib/data/matches";
import { londonDay } from "@/lib/format";

export type CalKind = "booked" | "open" | "waiting" | "played";

export type CalEvent = {
  id: string;
  matchId: string;
  startsAt: string;
  endsAt: string;
  day: string;
  address: string;
  kind: CalKind;
  sub: string;
};

const ev = (
  id: string,
  m: { id: string; starts_at: string; ends_at: string; address: string | null },
  kind: CalKind,
  sub: string,
): CalEvent => ({
  id,
  matchId: m.id,
  startsAt: m.starts_at,
  endsAt: m.ends_at,
  day: londonDay(m.starts_at),
  address: m.address ?? "Pitch to be confirmed",
  kind,
  sub,
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
  return [
    ...t.booked.map((i) => ev(i.match.id, i.match, "booked", i.keeper ? `Keeper: ${i.keeper.name}` : "Keeper booked")),
    ...t.open.map((i) =>
      ev(i.match.id, i.match, "open", i.pending > 0 ? `${i.pending} ${i.pending === 1 ? "keeper" : "keepers"} applied` : "Looking for a keeper"),
    ),
    ...t.past
      .filter((i) => i.match.status === "assigned" || i.match.status === "completed")
      .map((i) => ev(i.match.id, i.match, "played", i.keeper ? `Keeper: ${i.keeper.name}` : "Played")),
  ];
}
