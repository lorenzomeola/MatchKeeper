import { createClient } from "@/lib/supabase/server";
import type { KeeperApplication, MatchRow, OwnMatch } from "@/lib/data/dashboard";

export type MatchTab = "open" | "booked" | "past";
export const TABS: MatchTab[] = ["open", "booked", "past"];

export type PlayerItem = {
  match: OwnMatch;
  pending: number;
  keeper: { name: string; avatarUrl: string | null } | null;
};

export type KeeperItem = { application: KeeperApplication; match: MatchRow; poster: string };

const ended = (m: MatchRow, nowMs: number) => Date.parse(m.ends_at) < nowMs;

export async function loadPlayerMatches(userId: string) {
  const supabase = await createClient();
  const nowMs = Date.now();

  const { data } = await supabase
    .from("matches")
    .select("*, applications(id, status, rate, goalkeeper_id)")
    .eq("created_by", userId)
    .order("starts_at", { ascending: true });
  const matches = (data ?? []) as OwnMatch[];

  const acceptedIds = matches
    .map((m) => m.applications.find((a) => a.status === "accepted")?.goalkeeper_id)
    .filter((id): id is string => !!id);
  const keepers = new Map<string, { name: string; avatarUrl: string | null }>();
  if (acceptedIds.length > 0) {
    const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", acceptedIds);
    for (const p of profs ?? []) keepers.set(p.id, { name: p.display_name, avatarUrl: p.avatar_url });
  }

  const item = (m: OwnMatch): PlayerItem => ({
    match: m,
    pending: m.applications.filter((a) => a.status === "pending").length,
    keeper: keepers.get(m.applications.find((a) => a.status === "accepted")?.goalkeeper_id ?? "") ?? null,
  });

  const tabs: Record<MatchTab, PlayerItem[]> = {
    open: matches.filter((m) => m.status === "open" && !ended(m, nowMs)).map(item),
    booked: matches.filter((m) => m.status === "assigned" && !ended(m, nowMs)).map(item),
    past: matches.filter((m) => ended(m, nowMs) || m.status === "completed" || m.status === "cancelled").map(item).reverse(),
  };
  return tabs;
}

export async function loadKeeperGames(userId: string) {
  const supabase = await createClient();
  const nowMs = Date.now();

  const { data } = await supabase
    .from("applications")
    .select("id, match_id, status, rate, matches(*)")
    .eq("goalkeeper_id", userId)
    .order("created_at", { ascending: false });
  const apps = ((data ?? []) as unknown as KeeperApplication[]).filter((a) => a.matches);

  const posterIds = [...new Set(apps.map((a) => a.matches!.created_by))];
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

  const item = (a: KeeperApplication): KeeperItem => ({
    application: a,
    match: a.matches!,
    poster: names.get(a.matches!.created_by) ?? "A player",
  });
  const live = (a: KeeperApplication) => !ended(a.matches!, nowMs);

  const tabs: Record<MatchTab, KeeperItem[]> = {
    open: apps.filter((a) => a.status === "pending" && a.matches!.status === "open" && live(a)).map(item),
    booked: apps
      .filter((a) => a.status === "accepted" && live(a))
      .sort((a, b) => Date.parse(a.matches!.starts_at) - Date.parse(b.matches!.starts_at))
      .map(item),
    past: apps
      .filter((a) => !live(a) || a.status === "rejected" || a.status === "withdrawn" || (a.status === "pending" && a.matches!.status !== "open"))
      .map(item),
  };
  return tabs;
}
