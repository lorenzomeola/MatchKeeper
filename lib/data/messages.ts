import { createClient } from "@/lib/supabase/server";
import { isChatParticipant } from "@/lib/chat-participant";

type Client = Awaited<ReturnType<typeof createClient>>;

export type Person = { id: string; name: string; avatarUrl: string | null; role: "player" | "goalkeeper" };

type AppWithMatch = {
  id: string;
  status: string;
  rate: string | number;
  goalkeeper_id: string;
  match_id: string;
  matches: {
    id: string;
    created_by: string;
    starts_at: string;
    ends_at: string;
    address: string | null;
    status: string;
  } | null;
};

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };

export type Conversation = {
  applicationId: string;
  other: Person;
  matchAddress: string;
  matchStartsAt: string;
  appStatus: string;
  last: { body: string; createdAt: string; mine: boolean } | null;
  unread: number;
};

async function peopleById(supabase: Client, ids: string[]) {
  const map = new Map<string, Person>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, display_name, avatar_url, role").in("id", ids);
  for (const p of data ?? []) {
    map.set(p.id, {
      id: p.id,
      name: p.display_name,
      avatarUrl: p.avatar_url,
      role: p.role === "goalkeeper" ? "goalkeeper" : "player",
    });
  }
  return map;
}

/** Bandeja: un hilo por aplicación con al menos un mensaje, el más reciente primero. */
export async function loadConversations(userId: string): Promise<Conversation[]> {
  const supabase = await createClient();

  const { data: msgs } = await supabase
    .from("messages")
    .select("application_id, sender_id, body, created_at")
    .not("application_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = msgs ?? [];
  if (rows.length === 0) return [];

  const appIds = [...new Set(rows.map((m) => m.application_id as string))];

  const [{ data: reads }, { data: apps }] = await Promise.all([
    supabase.from("message_reads").select("application_id, last_read_at").eq("user_id", userId).in("application_id", appIds),
    supabase
      .from("applications")
      .select("id, status, rate, goalkeeper_id, match_id, matches(id, created_by, starts_at, ends_at, address, status)")
      .in("id", appIds),
  ]);

  const readAt = new Map((reads ?? []).map((r) => [r.application_id, Date.parse(r.last_read_at)]));
  const appMap = new Map(
    ((apps ?? []) as unknown as AppWithMatch[])
      .filter((a) => isChatParticipant(a, userId))
      .map((a) => [a.id, a]),
  );

  const otherIdOf = (a: AppWithMatch) => (a.matches?.created_by === userId ? a.goalkeeper_id : a.matches?.created_by ?? "");
  const people = await peopleById(supabase, [...new Set([...appMap.values()].map(otherIdOf).filter(Boolean))]);

  const byApp = new Map<string, Conversation>();
  for (const m of rows) {
    const a = appMap.get(m.application_id as string);
    if (!a || !a.matches) continue;
    let c = byApp.get(a.id);
    if (!c) {
      c = {
        applicationId: a.id,
        other: people.get(otherIdOf(a)) ?? { id: otherIdOf(a), name: "Unknown", avatarUrl: null, role: "player" },
        matchAddress: a.matches.address ?? "Pitch to be confirmed",
        matchStartsAt: a.matches.starts_at,
        appStatus: a.status,
        last: { body: m.body, createdAt: m.created_at, mine: m.sender_id === userId },
        unread: 0,
      };
      byApp.set(a.id, c);
    }
    if (m.sender_id !== userId && Date.parse(m.created_at) > (readAt.get(a.id) ?? 0)) c.unread += 1;
  }

  return [...byApp.values()];
}

export type Thread = {
  applicationId: string;
  matchId: string;
  other: Person;
  otherLabel: string;
  matchAddress: string;
  matchStartsAt: string;
  matchEndsAt: string;
  rate: string | number;
  appStatus: string;
  matchStatus: string;
  iAmPlayer: boolean;
  messages: ChatMessage[];
  otherReadAt: string | null;
  blockedByMe: boolean;
  blockedMe: boolean;
};

export async function loadThread(applicationId: string, userId: string): Promise<Thread | null> {
  const supabase = await createClient();

  const { data: app } = await supabase
    .from("applications")
    .select("id, status, rate, goalkeeper_id, match_id, matches(id, created_by, starts_at, ends_at, address, status)")
    .eq("id", applicationId)
    .maybeSingle();
  const a = app as unknown as AppWithMatch | null;
  if (!a || !a.matches || !isChatParticipant(a, userId)) return null;

  const iAmPlayer = a.matches.created_by === userId;
  const otherId = iAmPlayer ? a.goalkeeper_id : a.matches.created_by;

  const [people, { data: msgs }, { data: otherRead }, { data: blocks }, teamRes] = await Promise.all([
    peopleById(supabase, [otherId]),
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true })
      .limit(300),
    supabase.from("message_reads").select("last_read_at").eq("application_id", applicationId).eq("user_id", otherId).maybeSingle(),
    supabase.from("blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
    iAmPlayer
      ? Promise.resolve({ data: null })
      : supabase.from("teams").select("name").eq("owner_id", otherId).order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);

  const other = people.get(otherId) ?? { id: otherId, name: "Unknown", avatarUrl: null, role: iAmPlayer ? "goalkeeper" : "player" };
  const teamName = (teamRes.data as { name: string } | null)?.name;

  return {
    applicationId,
    matchId: a.matches.id,
    other: teamName ? { ...other, name: teamName } : other,
    otherLabel: iAmPlayer ? "Goalkeeper" : teamName ? `Team · ${other.name}` : "Player",
    matchAddress: a.matches.address ?? "Pitch to be confirmed",
    matchStartsAt: a.matches.starts_at,
    matchEndsAt: a.matches.ends_at,
    rate: a.rate,
    appStatus: a.status,
    matchStatus: a.matches.status,
    iAmPlayer,
    messages: (msgs ?? []) as ChatMessage[],
    otherReadAt: otherRead?.last_read_at ?? null,
    blockedByMe: (blocks ?? []).some((b) => b.blocker_id === userId && b.blocked_id === otherId),
    blockedMe: (blocks ?? []).some((b) => b.blocker_id === otherId && b.blocked_id === userId),
  };
}

export async function loadUnreadCount() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("unread_message_count");
  return typeof data === "number" ? data : 0;
}
