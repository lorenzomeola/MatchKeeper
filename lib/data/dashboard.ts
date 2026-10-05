import { createClient } from "@/lib/supabase/server";

export type MatchRow = {
  id: string;
  created_by: string;
  starts_at: string;
  ends_at: string;
  address: string | null;
  level: string | null;
  format: number | null;
  surface: string | null;
  notes: string | null;
  budget_suggested: string | number | null;
  status: "open" | "assigned" | "completed" | "cancelled";
};

type AppRef = { id: string; status: string; rate: string | number; goalkeeper_id: string };
export type OwnMatch = MatchRow & { applications: AppRef[] };
export type KeeperApplication = {
  id: string;
  match_id: string;
  status: string;
  rate: string | number;
  matches: MatchRow | null;
};

type Client = Awaited<ReturnType<typeof createClient>>;

const isUpcoming = (m: MatchRow, nowMs: number) => Date.parse(m.ends_at) >= nowMs;

async function namesOf(supabase: Client, ids: string[]) {
  const map = new Map<string, { name: string; avatarUrl: string | null }>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
  for (const p of data ?? []) map.set(p.id, { name: p.display_name, avatarUrl: p.avatar_url });
  return map;
}

export async function loadPlayerHome(userId: string) {
  const supabase = await createClient();
  const nowMs = Date.now();

  const { data } = await supabase
    .from("matches")
    .select("*, applications(id, status, rate, goalkeeper_id)")
    .eq("created_by", userId)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });

  const matches = (data ?? []) as OwnMatch[];
  const upcoming = matches.filter((m) => isUpcoming(m, nowMs));
  const played = matches.filter((m) => !isUpcoming(m, nowMs) && m.status !== "open").length;

  const pendingOf = (m: OwnMatch) => m.applications.filter((a) => a.status === "pending").length;
  const needsAttention = upcoming.filter((m) => m.status === "open" && pendingOf(m) > 0);
  const booked = upcoming.filter((m) => m.status === "assigned");
  const open = upcoming.filter((m) => m.status === "open");

  const keeperIds = booked
    .map((m) => m.applications.find((a) => a.status === "accepted")?.goalkeeper_id)
    .filter((id): id is string => !!id);
  const keepers = await namesOf(supabase, keeperIds);

  const next = upcoming[0] ?? null;
  const nextKeeper =
    next && next.status === "assigned"
      ? keepers.get(next.applications.find((a) => a.status === "accepted")?.goalkeeper_id ?? "") ?? null
      : null;

  return {
    upcoming,
    next,
    nextKeeper,
    nextPending: next ? pendingOf(next) : 0,
    openCount: open.length,
    bookedCount: booked.length,
    waitingCount: needsAttention.reduce((sum, m) => sum + pendingOf(m), 0),
    playedCount: played,
    totalPosted: matches.length,
    needsAttention: needsAttention.map((m) => ({ match: m, pending: pendingOf(m) })),
    pendingOf,
  };
}

export async function loadKeeperHome(userId: string) {
  const supabase = await createClient();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const [{ data: appData }, { data: openData }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, match_id, status, rate, matches(*)")
      .eq("goalkeeper_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("matches")
      .select("*")
      .eq("status", "open")
      .gte("ends_at", nowIso)
      .neq("created_by", userId)
      .order("starts_at", { ascending: true })
      .limit(40),
  ]);

  const apps = (appData ?? []) as unknown as KeeperApplication[];
  const appliedIds = new Set(apps.map((a) => a.match_id));

  const booked = apps
    .filter((a) => a.status === "accepted" && a.matches && isUpcoming(a.matches, nowMs))
    .sort((a, b) => Date.parse(a.matches!.starts_at) - Date.parse(b.matches!.starts_at));
  const waiting = apps.filter(
    (a) => a.status === "pending" && a.matches && a.matches.status === "open" && isUpcoming(a.matches, nowMs),
  );
  const available = ((openData ?? []) as MatchRow[]).filter((m) => !appliedIds.has(m.id));

  const posterIds = [...new Set([...available.slice(0, 6), ...booked.map((b) => b.matches!)].map((m) => m.created_by))];
  const posters = await namesOf(supabase, posterIds);
  const teamNames = new Map<string, string>();
  if (posterIds.length > 0) {
    const { data: teams } = await supabase
      .from("teams")
      .select("owner_id, name")
      .in("owner_id", posterIds)
      .order("created_at", { ascending: true });
    for (const t of teams ?? []) if (!teamNames.has(t.owner_id)) teamNames.set(t.owner_id, t.name);
  }
  const posterLabel = (id: string) => teamNames.get(id) ?? posters.get(id)?.name ?? "A player";

  return {
    next: booked[0] ?? null,
    bookedCount: booked.length,
    waitingCount: waiting.length,
    availableCount: available.length,
    available: available.slice(0, 4),
    recent: apps.filter((a) => a.matches).slice(0, 4),
    posterLabel,
    totalApplied: apps.length,
  };
}
