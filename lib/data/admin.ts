import { createClient } from "@/lib/supabase/server";
import { completeness, profileChecklist, valuesFromRow, type Role } from "@/lib/profile";

type Client = Awaited<ReturnType<typeof createClient>>;

export type AdminProfile = {
  id: string;
  role: Role;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  level: string | null;
  experience_years: number | null;
  approved: boolean;
  is_admin: boolean;
  created_at: string;
  player_kind?: string | null;
};

const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

export async function namesOf(supabase: Client, ids: string[]) {
  const map = new Map<string, { name: string; avatarUrl: string | null; role: string }>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, display_name, avatar_url, role").in("id", [...new Set(ids)]);
  for (const p of data ?? []) map.set(p.id, { name: p.display_name, avatarUrl: p.avatar_url, role: p.role });
  return map;
}

export function profileRating(p: AdminProfile) {
  const role: Role = p.role === "goalkeeper" ? "goalkeeper" : "player";
  return completeness(profileChecklist(role, valuesFromRow(p, "")));
}

export async function loadAdminOverview() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const head = { count: "exact", head: true } as const;

  const [
    users,
    players,
    keepers,
    pendingKeepers,
    newUsers,
    openMatches,
    bookedMatches,
    totalMatches,
    applications,
    bookings,
    openReports,
    { data: pendingList },
    { data: reportList },
    { data: matchList },
  ] = await Promise.all([
    count(supabase.from("profiles").select("id", head)),
    count(supabase.from("profiles").select("id", head).eq("role", "player")),
    count(supabase.from("profiles").select("id", head).eq("role", "goalkeeper")),
    count(supabase.from("profiles").select("id", head).eq("role", "goalkeeper").eq("approved", false)),
    count(supabase.from("profiles").select("id", head).gte("created_at", weekAgo)),
    count(supabase.from("matches").select("id", head).eq("status", "open").gte("ends_at", nowIso)),
    count(supabase.from("matches").select("id", head).eq("status", "assigned").gte("ends_at", nowIso)),
    count(supabase.from("matches").select("id", head)),
    count(supabase.from("applications").select("id", head)),
    count(supabase.from("bookings").select("id", head)),
    count(supabase.from("reports").select("id", head).eq("status", "open")),
    supabase.from("profiles").select("*").eq("role", "goalkeeper").eq("approved", false).order("created_at", { ascending: true }).limit(4),
    supabase.from("reports").select("id, reporter_id, reported_id, reason, created_at").eq("status", "open").order("created_at", { ascending: true }).limit(3),
    supabase.from("matches").select("id, address, starts_at, status, created_by").order("created_at", { ascending: false }).limit(5),
  ]);

  const reports = reportList ?? [];
  const matches = matchList ?? [];
  const names = await namesOf(supabase, [
    ...reports.flatMap((r) => [r.reporter_id, r.reported_id]),
    ...matches.map((m) => m.created_by),
  ]);

  return {
    counts: { users, players, keepers, pendingKeepers, newUsers, openMatches, bookedMatches, totalMatches, applications, bookings, openReports },
    pending: (pendingList ?? []) as AdminProfile[],
    reports,
    matches,
    names,
  };
}

export async function loadKeepers(tab: "pending" | "approved" | "all", q: string) {
  const supabase = await createClient();
  let query = supabase.from("profiles").select("*").eq("role", "goalkeeper");
  if (tab === "pending") query = query.eq("approved", false);
  if (tab === "approved") query = query.eq("approved", true);
  if (q) query = query.ilike("display_name", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await query.order("created_at", { ascending: tab !== "approved" }).limit(100);

  const [pending, approved, all] = await Promise.all([
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "goalkeeper").eq("approved", false)),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "goalkeeper").eq("approved", true)),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "goalkeeper")),
  ]);
  return { list: (data ?? []) as AdminProfile[], counts: { pending, approved, all } };
}

export async function loadUsers(tab: "all" | "player" | "goalkeeper", q: string) {
  const supabase = await createClient();
  let query = supabase.from("profiles").select("*");
  if (tab !== "all") query = query.eq("role", tab);
  if (q) query = query.ilike("display_name", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await query.order("created_at", { ascending: false }).limit(100);

  const [all, players, keepers] = await Promise.all([
    count(supabase.from("profiles").select("id", { count: "exact", head: true })),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "player")),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "goalkeeper")),
  ]);
  return { list: (data ?? []) as AdminProfile[], counts: { all, player: players, goalkeeper: keepers } };
}

export async function loadAdminMatches(tab: "open" | "booked" | "past" | "cancelled") {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const base = () => supabase.from("matches").select("*, applications(id, status, goalkeeper_id)");

  let query = base();
  if (tab === "open") query = query.eq("status", "open").gte("ends_at", nowIso);
  if (tab === "booked") query = query.eq("status", "assigned").gte("ends_at", nowIso);
  if (tab === "past") query = query.neq("status", "cancelled").lt("ends_at", nowIso);
  if (tab === "cancelled") query = query.eq("status", "cancelled");
  const { data } = await query.order("starts_at", { ascending: tab === "open" || tab === "booked" }).limit(100);

  const head = { count: "exact", head: true } as const;
  const [open, booked, past, cancelled] = await Promise.all([
    count(supabase.from("matches").select("id", head).eq("status", "open").gte("ends_at", nowIso)),
    count(supabase.from("matches").select("id", head).eq("status", "assigned").gte("ends_at", nowIso)),
    count(supabase.from("matches").select("id", head).neq("status", "cancelled").lt("ends_at", nowIso)),
    count(supabase.from("matches").select("id", head).eq("status", "cancelled")),
  ]);

  const rows = (data ?? []) as {
    id: string;
    created_by: string;
    starts_at: string;
    ends_at: string;
    address: string | null;
    status: string;
    format: number | null;
    surface: string | null;
    level: string | null;
    budget_suggested: string | number | null;
    applications: { id: string; status: string; goalkeeper_id: string }[];
  }[];

  const names = await namesOf(supabase, [
    ...rows.map((r) => r.created_by),
    ...rows.flatMap((r) => r.applications.filter((a) => a.status === "accepted").map((a) => a.goalkeeper_id)),
  ]);
  return { rows, names, counts: { open, booked, past, cancelled } };
}

export type ReportRow = {
  id: string;
  reporter_id: string;
  reported_id: string;
  application_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

export async function loadReports(tab: "open" | "reviewed" | "dismissed") {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("status", tab)
    .order("created_at", { ascending: tab !== "open" ? false : true })
    .limit(100);
  const head = { count: "exact", head: true } as const;
  const [open, reviewed, dismissed] = await Promise.all([
    count(supabase.from("reports").select("id", head).eq("status", "open")),
    count(supabase.from("reports").select("id", head).eq("status", "reviewed")),
    count(supabase.from("reports").select("id", head).eq("status", "dismissed")),
  ]);
  const rows = (data ?? []) as ReportRow[];
  const names = await namesOf(supabase, rows.flatMap((r) => [r.reporter_id, r.reported_id]));
  return { rows, names, counts: { open, reviewed, dismissed } };
}

type ReportMatch = { id: string; address: string | null; starts_at: string };

export async function loadReportDetail(id: string) {
  const supabase = await createClient();
  const { data: report } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
  if (!report) return null;
  const r = report as ReportRow;

  const names = await namesOf(supabase, [r.reporter_id, r.reported_id]);
  let messages: { id: string; sender_id: string; body: string; created_at: string }[] = [];
  let match: ReportMatch | null = null;
  if (r.application_id) {
    const [{ data: msgs }, { data: app }] = await Promise.all([
      supabase.from("messages").select("id, sender_id, body, created_at").eq("application_id", r.application_id).order("created_at", { ascending: true }).limit(200),
      supabase.from("applications").select("matches(id, address, starts_at)").eq("id", r.application_id).maybeSingle(),
    ]);
    messages = msgs ?? [];
    match = ((app as unknown as { matches: ReportMatch | null } | null)?.matches) ?? null;
  }
  const { data: reportedProfile } = await supabase.from("profiles").select("*").eq("id", r.reported_id).maybeSingle();
  return { report: r, names, messages, match, reported: (reportedProfile ?? null) as AdminProfile | null };
}

export async function loadUserDetail(id: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) return null;
  const head = { count: "exact", head: true } as const;
  const [matches, applications, bookingsAs, reportsAgainst, reportsBy, { data: team }] = await Promise.all([
    count(supabase.from("matches").select("id", head).eq("created_by", id)),
    count(supabase.from("applications").select("id", head).eq("goalkeeper_id", id)),
    count(supabase.from("bookings").select("id", head).or(`player_id.eq.${id},goalkeeper_id.eq.${id}`)),
    count(supabase.from("reports").select("id", head).eq("reported_id", id)),
    count(supabase.from("reports").select("id", head).eq("reporter_id", id)),
    supabase.from("teams").select("name").eq("owner_id", id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);
  const { data: reports } = await supabase.from("reports").select("id, reason, status, created_at").eq("reported_id", id).order("created_at", { ascending: false }).limit(5);
  return {
    profile: profile as AdminProfile,
    teamName: team?.name ?? "",
    counts: { matches, applications, bookings: bookingsAs, reportsAgainst, reportsBy },
    reports: reports ?? [],
  };
}

export async function loadPayments() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, rate, commission_pct, payment_status, created_at, match_id, player_id, goalkeeper_id, matches(address, starts_at)")
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as unknown as {
    id: string;
    rate: string | number;
    commission_pct: string | number;
    payment_status: string;
    created_at: string;
    match_id: string;
    player_id: string;
    goalkeeper_id: string;
    matches: { address: string | null; starts_at: string } | null;
  }[];
  const names = await namesOf(supabase, rows.flatMap((r) => [r.player_id, r.goalkeeper_id]));
  return { rows, names };
}
