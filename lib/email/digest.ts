import "server-only";
import { sameCategory } from "@/lib/profile";
import { appUrl } from "@/lib/payments/app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DIGEST_LIST_MAX,
  DIGEST_QUIET_AFTER_CHAT_MS,
  DIGEST_WINDOW_DAYS,
  digestKey,
  digestLine,
  messagedRecently,
  pickDigestMatches,
  type DigestMatch,
} from "./digest-rules";
import { queueEmail } from "./outbox";

/** Resumen semanal a cada portero aprobado que no lo ha desactivado. Idempotente por portero y día. */
export async function sendMatchDigest(now = new Date()) {
  const admin = createAdminClient();
  const summary = { openMatches: 0, keepers: 0, queued: 0, nothingNew: 0, messagedToday: 0, noEmail: 0 };

  const horizon = new Date(now.getTime() + DIGEST_WINDOW_DAYS * 86_400_000).toISOString();
  const { data: matches, error } = await admin
    .from("matches")
    .select("id, created_by, starts_at, ends_at, address, format, category")
    .eq("status", "open")
    .gt("starts_at", now.toISOString())
    .lte("starts_at", horizon)
    .order("starts_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  const open = (matches ?? []) as (DigestMatch & { category: string | null })[];
  summary.openMatches = open.length;
  if (open.length === 0) return summary;

  const { data: keepers, error: keepersError } = await admin
    .from("profiles")
    .select("id, category")
    .eq("role", "goalkeeper")
    .eq("approved", true)
    .eq("match_digest", true);
  if (keepersError) throw keepersError;
  summary.keepers = keepers?.length ?? 0;
  if (!keepers?.length) return summary;

  const [{ data: apps, error: appsError }, { data: recent, error: recentError }] = await Promise.all([
    admin.from("applications").select("match_id, goalkeeper_id").in("match_id", open.map((m) => m.id)),
    admin
      .from("support_messages")
      .select("keeper_id, created_at")
      .eq("from_admin", true)
      .gte("created_at", new Date(now.getTime() - DIGEST_QUIET_AFTER_CHAT_MS).toISOString()),
  ]);
  if (appsError) throw appsError;
  if (recentError) throw recentError;

  const applied = new Map<string, Set<string>>();
  for (const a of apps ?? []) {
    if (!applied.has(a.goalkeeper_id)) applied.set(a.goalkeeper_id, new Set());
    applied.get(a.goalkeeper_id)!.add(a.match_id);
  }
  const lastAdminMessage = new Map<string, Date>();
  for (const r of recent ?? []) {
    const at = new Date(r.created_at);
    if (!lastAdminMessage.has(r.keeper_id) || lastAdminMessage.get(r.keeper_id)! < at) lastAdminMessage.set(r.keeper_id, at);
  }

  for (const k of keepers) {
    const joinable = open.filter((m) => sameCategory(m.category, k.category));
    const picks = pickDigestMatches(joinable, k.id, applied.get(k.id) ?? new Set());
    if (picks.length === 0) {
      summary.nothingNew++;
      continue;
    }
    if (messagedRecently(lastAdminMessage.get(k.id) ?? null, now)) {
      summary.messagedToday++;
      continue;
    }
    const { data: auth } = await admin.auth.admin.getUserById(k.id);
    const email = auth?.user?.email;
    if (!email) {
      summary.noEmail++;
      continue;
    }
    await queueEmail({
      template: "match_digest_keeper",
      toEmail: email,
      toUserId: k.id,
      dedupe: digestKey(k.id, now),
      data: {
        count: picks.length,
        matches: picks.slice(0, DIGEST_LIST_MAX).map(digestLine),
        browseUrl: `${appUrl()}/map`,
        profileUrl: `${appUrl()}/profile`,
      },
    });
    summary.queued++;
  }
  return summary;
}
