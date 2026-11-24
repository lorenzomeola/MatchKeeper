import { dateTile, longDate, splitAddress, timeRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type SupportMessage = { id: string; keeper_id: string; sender_id: string | null; from_admin: boolean; body: string; created_at: string };

type ThreadRow = { keeper_id: string; last_message_at: string; keeper_read_at: string | null; admin_read_at: string | null };

const after = (iso: string, mark: string | null) => !mark || Date.parse(iso) > Date.parse(mark);

/** Hilo del portero con el equipo de MatchKeeper, o null si nadie le ha escrito aún. */
export async function loadKeeperSupport(keeperId: string) {
  const supabase = await createClient();
  const { data: thread } = await supabase
    .from("support_threads")
    .select("keeper_id, last_message_at, keeper_read_at, admin_read_at")
    .eq("keeper_id", keeperId)
    .maybeSingle();
  if (!thread) return null;
  const { data: msgs } = await supabase
    .from("support_messages")
    .select("id, keeper_id, sender_id, from_admin, body, created_at")
    .eq("keeper_id", keeperId)
    .order("created_at", { ascending: true })
    .limit(300);
  const t = thread as ThreadRow;
  const messages = (msgs ?? []) as SupportMessage[];
  return {
    thread: t,
    messages,
    unread: messages.filter((m) => m.from_admin && after(m.created_at, t.keeper_read_at)).length,
  };
}

export type SupportSummary = { last: { body: string; createdAt: string; mine: boolean } | null; unread: number };

/** Lo que necesita la bandeja del portero para fijar arriba la conversación con MatchKeeper. */
export async function loadSupportSummary(keeperId: string): Promise<SupportSummary | null> {
  const s = await loadKeeperSupport(keeperId);
  if (!s) return null;
  const m = s.messages[s.messages.length - 1];
  return { last: m ? { body: m.body, createdAt: m.created_at, mine: !m.from_admin } : null, unread: s.unread };
}

export type InboxRow = {
  keeperId: string;
  name: string;
  avatarUrl: string | null;
  approved: boolean;
  lastMessageAt: string;
  last: { body: string; fromAdmin: boolean } | null;
  unread: number;
};

/** Buzón compartido de admins: un hilo por portero, el más reciente primero. RLS deja leerlo solo a admins. */
export async function loadSupportInbox(): Promise<InboxRow[]> {
  const supabase = await createClient();
  const { data: threads } = await supabase
    .from("support_threads")
    .select("keeper_id, last_message_at, keeper_read_at, admin_read_at")
    .order("last_message_at", { ascending: false })
    .limit(200);
  const rows = (threads ?? []) as ThreadRow[];
  if (rows.length === 0) return [];
  const ids = rows.map((t) => t.keeper_id);

  const [{ data: people }, { data: msgs }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_url, approved").in("id", ids),
    supabase
      .from("support_messages")
      .select("keeper_id, from_admin, body, created_at")
      .in("keeper_id", ids)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  const lastOf = new Map<string, { body: string; fromAdmin: boolean }>();
  const unreadOf = new Map<string, number>();
  const readAt = new Map(rows.map((t) => [t.keeper_id, t.admin_read_at]));
  for (const m of msgs ?? []) {
    if (!lastOf.has(m.keeper_id)) lastOf.set(m.keeper_id, { body: m.body, fromAdmin: m.from_admin });
    if (!m.from_admin && after(m.created_at, readAt.get(m.keeper_id) ?? null)) unreadOf.set(m.keeper_id, (unreadOf.get(m.keeper_id) ?? 0) + 1);
  }

  return rows.map((t) => {
    const p = byId.get(t.keeper_id);
    return {
      keeperId: t.keeper_id,
      name: p?.display_name ?? "Unknown keeper",
      avatarUrl: p?.avatar_url ?? null,
      approved: p?.approved === true,
      lastMessageAt: t.last_message_at,
      last: lastOf.get(t.keeper_id) ?? null,
      unread: unreadOf.get(t.keeper_id) ?? 0,
    };
  });
}

/** Mensajes de un hilo vistos por un admin (puede no existir aún: el primer mensaje lo crea). */
export async function loadSupportMessages(keeperId: string) {
  const supabase = await createClient();
  const [{ data: thread }, { data: msgs }] = await Promise.all([
    supabase.from("support_threads").select("keeper_read_at").eq("keeper_id", keeperId).maybeSingle(),
    supabase
      .from("support_messages")
      .select("id, keeper_id, sender_id, from_admin, body, created_at")
      .eq("keeper_id", keeperId)
      .order("created_at", { ascending: true })
      .limit(300),
  ]);
  return { messages: (msgs ?? []) as SupportMessage[], keeperReadAt: (thread?.keeper_read_at as string | null | undefined) ?? null };
}

/** Partidos abiertos que aún no han empezado: cuántos hay y opciones para la plantilla de partido urgente. */
export async function loadOpenMatchOptions(origin: string) {
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("matches")
    .select("id, starts_at, ends_at, address", { count: "exact" })
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(20);
  const options = (data ?? []).map((m) => {
    const t = dateTile(m.starts_at);
    const pitch = splitAddress(m.address).name;
    return {
      id: m.id as string,
      label: `${t.weekday} ${t.day} ${t.month}, ${timeRange(m.starts_at, m.ends_at)} · ${pitch}`,
      pitch,
      when: `${longDate(m.starts_at)}, ${timeRange(m.starts_at, m.ends_at)}`,
      url: `${origin}/matches/${m.id}`,
    };
  });
  return { count: count ?? options.length, options };
}

/** Si la función aún no existe (SQL sin aplicar) cuenta 0 en vez de romper la página. */
export async function loadSupportUnread(isAdmin: boolean) {
  const supabase = await createClient();
  const [mine, inbox] = await Promise.all([
    supabase.rpc("support_unread_count"),
    isAdmin ? supabase.rpc("support_inbox_unread_count") : Promise.resolve({ data: 0 }),
  ]);
  return {
    keeper: typeof mine.data === "number" ? mine.data : 0,
    inbox: typeof inbox.data === "number" ? inbox.data : 0,
  };
}
