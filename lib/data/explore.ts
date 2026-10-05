import { createClient } from "@/lib/supabase/server";
import type { KeeperApplication, MatchRow } from "@/lib/data/dashboard";

export type PinKind = "open" | "applied" | "booked" | "mine" | "mine-booked";

export type ExploreMatch = {
  id: string;
  lat: number;
  lng: number;
  address: string | null;
  starts_at: string;
  ends_at: string;
  format: number | null;
  surface: string | null;
  level: string | null;
  budget_suggested: string | number | null;
  kind: PinKind;
  by: string;
};

type MatchWithCoords = MatchRow & { lat: number; lng: number };

const pin = (m: MatchWithCoords, kind: PinKind, by: string): ExploreMatch => ({
  id: m.id,
  lat: m.lat,
  lng: m.lng,
  address: m.address,
  starts_at: m.starts_at,
  ends_at: m.ends_at,
  format: m.format,
  surface: m.surface,
  level: m.level,
  budget_suggested: m.budget_suggested,
  kind,
  by,
});

/** Partidos para el mapa. El portero ve abiertos, aplicados y reservados; el jugador, los suyos. */
export async function loadExplore(userId: string, isKeeper: boolean): Promise<ExploreMatch[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  if (!isKeeper) {
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("created_by", userId)
      .in("status", ["open", "assigned"])
      .gte("ends_at", nowIso)
      .order("starts_at", { ascending: true });
    return ((data ?? []) as MatchWithCoords[]).map((m) => pin(m, m.status === "assigned" ? "mine-booked" : "mine", "You"));
  }

  const [{ data: openData }, { data: appData }] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .eq("status", "open")
      .gte("ends_at", nowIso)
      .neq("created_by", userId)
      .order("starts_at", { ascending: true })
      .limit(200),
    supabase.from("applications").select("id, match_id, status, rate, matches(*)").eq("goalkeeper_id", userId),
  ]);

  const apps = ((appData ?? []) as unknown as KeeperApplication[]).filter(
    (a) => a.matches && Date.parse(a.matches.ends_at) >= Date.now() && (a.status === "pending" || a.status === "accepted"),
  );
  const mineIds = new Map(apps.map((a) => [a.match_id, a.status === "accepted" ? "booked" : "applied"] as const));

  const all = new Map<string, MatchWithCoords>();
  for (const m of (openData ?? []) as MatchWithCoords[]) all.set(m.id, m);
  for (const a of apps) all.set(a.match_id, a.matches as MatchWithCoords);

  const posterIds = [...new Set([...all.values()].map((m) => m.created_by))];
  const names = new Map<string, string>();
  if (posterIds.length > 0) {
    const [{ data: profs }, { data: teams }] = await Promise.all([
      supabase.from("profiles").select("id, display_name").in("id", posterIds),
      supabase.from("teams").select("owner_id, name").in("owner_id", posterIds).order("created_at", { ascending: true }),
    ]);
    for (const p of profs ?? []) names.set(p.id, p.display_name);
    const seen = new Set<string>();
    for (const t of teams ?? []) {
      if (!seen.has(t.owner_id)) {
        names.set(t.owner_id, t.name);
        seen.add(t.owner_id);
      }
    }
  }

  return [...all.values()]
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .map((m) => pin(m, mineIds.get(m.id) ?? "open", names.get(m.created_by) ?? "A player"));
}
