import { createClient } from "@/lib/supabase/server";
import type { KeeperApplication, MatchRow, OwnMatch } from "@/lib/data/dashboard";
import { keeperMatchTab } from "@/lib/match-list-status";

export type MatchTab = "open" | "booked" | "past";
export const TABS: MatchTab[] = ["open", "booked", "past"];

export type PlayerItem = {
  match: OwnMatch;
  pending: number;
  /** Porteros ya reservados (con 2 plazas puede haber 0, 1 o 2). */
  keepers: { name: string; avatarUrl: string | null }[];
  bookingStatuses: string[];
};

export type KeeperItem = { application: KeeperApplication; match: MatchRow; poster: string; bookingStatus: string | null };

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
  const { data: bookings, error: bookingError } = await supabase.from("bookings")
    .select("match_id, status").eq("player_id", userId);
  if (bookingError) throw bookingError;

  const acceptedOf = (m: OwnMatch) => m.applications.filter((a) => a.status === "accepted");
  const acceptedIds = matches.flatMap((m) => acceptedOf(m).map((a) => a.goalkeeper_id));
  const keepers = new Map<string, { name: string; avatarUrl: string | null }>();
  if (acceptedIds.length > 0) {
    const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", acceptedIds);
    for (const p of profs ?? []) keepers.set(p.id, { name: p.display_name, avatarUrl: p.avatar_url });
  }

  const item = (m: OwnMatch): PlayerItem => ({
    match: m,
    pending: m.applications.filter((a) => a.status === "pending").length,
    bookingStatuses: (bookings ?? []).filter((b) => b.match_id === m.id).map((b) => b.status),
    keepers: acceptedOf(m)
      .map((a) => keepers.get(a.goalkeeper_id))
      .filter((k): k is { name: string; avatarUrl: string | null } => !!k),
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
  const { data: bookings, error: bookingError } = await supabase.from("bookings")
    .select("application_id, status").eq("goalkeeper_id", userId).order("created_at", { ascending: false });
  if (bookingError) throw bookingError;
  const bookingStatus = (a: KeeperApplication): string | null => bookings?.find((b) => b.application_id === a.id)?.status ?? null;

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
    bookingStatus: bookingStatus(a),
  });
  const tabOf = (a: KeeperApplication) => keeperMatchTab({
    applicationStatus: a.status, matchStatus: a.matches!.status,
    bookingStatus: bookingStatus(a), ended: ended(a.matches!, nowMs),
  });

  const tabs: Record<MatchTab, KeeperItem[]> = {
    open: apps.filter((a) => tabOf(a) === "open").map(item),
    booked: apps
      .filter((a) => tabOf(a) === "booked")
      .sort((a, b) => Date.parse(a.matches!.starts_at) - Date.parse(b.matches!.starts_at))
      .map(item),
    past: apps
      .filter((a) => tabOf(a) === "past")
      .map(item),
  };
  return tabs;
}
