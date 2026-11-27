import "server-only";
import { longDate, splitAddress, timeRange } from "@/lib/format";
import { changeLine, type MatchChange, type UpdateKind } from "@/lib/match-changes";
import { appUrl } from "@/lib/payments/app-url";
import { sameCategory } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { queueEmail } from "./outbox";

// Un partido no avisa más de una vez por hora: evita inundar a los porteros si el equipo retoca varias veces.
const THROTTLE_MS = 60 * 60_000;
const BATCH = 10;

/**
 * Partido editado: los porteros que ya aplicaron reciben un aviso propio y el resto de porteros aprobados de la
 * categoría (que no han desactivado los emails de partidos) otro, distinto según qué cambió.
 */
export async function notifyMatchUpdated(matchId: string, changes: MatchChange[], kind: UpdateKind) {
  if (changes.length === 0) return;
  const admin = createAdminClient();

  const { data: match } = await admin
    .from("matches")
    .select("id, created_by, address, starts_at, ends_at, status, category")
    .eq("id", matchId)
    .maybeSingle();
  if (!match || match.status !== "open" || Date.parse(match.starts_at) <= Date.now()) return;

  const { data: recent } = await admin
    .from("email_outbox")
    .select("id")
    .like("dedupe_key", `match_updated:${matchId}:%`)
    .gte("created_at", new Date(Date.now() - THROTTLE_MS).toISOString())
    .limit(1);
  if (recent && recent.length > 0) return;

  const stamp = new Date().toISOString();
  const pitch = splitAddress(match.address).name;
  const when = `${longDate(match.starts_at)}, ${timeRange(match.starts_at, match.ends_at)}`;
  const matchUrl = `${appUrl()}/matches/${match.id}`;
  const lines = changes.map(changeLine);

  const { data: apps } = await admin.from("applications").select("goalkeeper_id, status").eq("match_id", matchId);
  const involved = new Set((apps ?? []).map((a) => a.goalkeeper_id));
  const applicants = (apps ?? []).filter((a) => a.status === "pending").map((a) => a.goalkeeper_id);

  const { data: keepers } = await admin
    .from("profiles")
    .select("id, category")
    .eq("role", "goalkeeper")
    .eq("approved", true)
    .eq("match_digest", true)
    .neq("id", match.created_by);
  const others = (keepers ?? []).filter((k) => !involved.has(k.id) && sameCategory(match.category, k.category)).map((k) => k.id);

  const emailOf = async (id: string) => (await admin.auth.admin.getUserById(id)).data.user?.email ?? null;
  const send = async (ids: string[], build: (id: string, email: string) => Promise<void>) => {
    for (let i = 0; i < ids.length; i += BATCH) {
      await Promise.all(
        ids.slice(i, i + BATCH).map(async (id) => {
          const email = await emailOf(id);
          if (email) await build(id, email);
        }),
      );
    }
  };

  await send(applicants, (id, email) =>
    queueEmail({
      template: "match_updated_applicant",
      toEmail: email,
      toUserId: id,
      dedupe: `match_updated:${matchId}:${stamp}:${id}`,
      data: { pitch, when, kind, changes: lines, matchUrl },
    }),
  );
  await send(others, (id, email) =>
    queueEmail({
      template: "match_updated_keeper",
      toEmail: email,
      toUserId: id,
      dedupe: `match_updated:${matchId}:${stamp}:${id}`,
      data: { pitch, when, kind, changes: lines, matchUrl, profileUrl: `${appUrl()}/profile` },
    }),
  );
}
