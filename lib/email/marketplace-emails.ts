import "server-only";
import { longDate, moneyPence, splitAddress, timeRange } from "@/lib/format";
import { appUrl } from "@/lib/payments/app-url";
import { getPaymentMode } from "@/lib/payments/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { partyOf, type BookingCtx } from "./booking-context";
import { CHAT_DELAY_MS, chatKey, chatNoticeAllowed, readAfter } from "./chat-rules";
import { cancelEmails, queueEmail } from "./outbox";

type MatchRow = { created_by: string; address: string | null; starts_at: string; ends_at: string };

const pitchOf = (m: MatchRow) => splitAddress(m.address).name;
const whenOf = (m: MatchRow) => `${longDate(m.starts_at)}, ${timeRange(m.starts_at, m.ends_at)}`;

/** Candidatura nueva: aviso al equipo dueño del partido. */
export async function notifyNewApplication(applicationId: string) {
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("applications")
    .select("id, match_id, goalkeeper_id, rate, status, matches(created_by, address, starts_at, ends_at)")
    .eq("id", applicationId)
    .maybeSingle();
  const match = (a?.matches ?? null) as MatchRow | null;
  if (!a || !match || a.status !== "pending") return;

  const [team, keeper] = await Promise.all([partyOf(match.created_by, "The team"), partyOf(a.goalkeeper_id, "A keeper")]);
  if (!team.email) return;
  await queueEmail({
    template: "application_received_team",
    toEmail: team.email,
    toUserId: team.id,
    dedupe: `application:${a.id}:received`,
    data: { keeperName: keeper.name, rate: moneyPence(Math.round(Number(a.rate) * 100)), pitch: pitchOf(match), when: whenOf(match), matchUrl: `${appUrl()}/matches/${a.match_id}` },
  });
}

/** Reserva pagada: los candidatos que quedaron descartados saben que el equipo eligió a otro. */
export async function notifyNotSelected(c: BookingCtx) {
  const { data: apps } = await createAdminClient()
    .from("applications")
    .select("id, goalkeeper_id")
    .eq("match_id", c.matchId)
    .eq("status", "rejected")
    .neq("goalkeeper_id", c.keeper.id);
  for (const a of apps ?? []) {
    const keeper = await partyOf(a.goalkeeper_id, "The keeper");
    if (!keeper.email) continue;
    await queueEmail({
      template: "application_not_selected_keeper",
      toEmail: keeper.email,
      toUserId: keeper.id,
      dedupe: `application:${a.id}:not_selected:${c.id}`,
      data: { pitch: c.pitch, when: c.when, browseUrl: `${appUrl()}/matches` },
    });
  }
}

/** El equipo canceló una de dos reservas y ya no busca más porteros: las candidaturas descartadas no vuelven. */
export async function notifyApplicationsClosed(c: BookingCtx, closedIds: string[]) {
  if (closedIds.length === 0) return;
  const admin = createAdminClient();
  // Si el partido entero se canceló no hay nada que avisar: ya no existe.
  const { data: match } = await admin.from("matches").select("status").eq("id", c.matchId).maybeSingle();
  if (!match || match.status === "cancelled") return;
  const { data: apps } = await admin
    .from("applications")
    .select("id, goalkeeper_id")
    .eq("match_id", c.matchId)
    .eq("status", "rejected")
    .in("id", closedIds);
  for (const a of apps ?? []) {
    const keeper = await partyOf(a.goalkeeper_id, "The keeper");
    if (!keeper.email) continue;
    await queueEmail({
      template: "application_closed_keeper",
      toEmail: keeper.email,
      toUserId: keeper.id,
      dedupe: `application:${a.id}:closed:${c.id}`,
      data: { pitch: c.pitch, when: c.when, browseUrl: `${appUrl()}/matches` },
    });
  }
}

/** El portero reservado canceló y el partido se reabre: se avisa a las candidaturas que vuelven a pendiente. */
export async function notifyReopened(c: BookingCtx, restoredIds: string[]) {
  if (restoredIds.length === 0) return;
  const { data: apps } = await createAdminClient()
    .from("applications")
    .select("id, goalkeeper_id")
    .eq("match_id", c.matchId)
    .eq("status", "pending")
    .in("id", restoredIds)
    .neq("goalkeeper_id", c.keeper.id);
  for (const a of apps ?? []) {
    const keeper = await partyOf(a.goalkeeper_id, "The keeper");
    if (!keeper.email) continue;
    await queueEmail({
      template: "match_reopened_keeper",
      toEmail: keeper.email,
      toUserId: keeper.id,
      dedupe: `application:${a.id}:reopened:${c.id}`,
      data: { pitch: c.pitch, when: c.when, matchUrl: c.matchUrl },
    });
  }
}

/** Solo la primera aprobación avisa: revocar y volver a aprobar no repite el correo. */
export async function notifyKeeperApproved(profileId: string) {
  const keeper = await partyOf(profileId, "Keeper");
  if (!keeper.email) return;
  const mode = await getPaymentMode();
  await queueEmail({
    template: "keeper_approved",
    toEmail: keeper.email,
    toUserId: keeper.id,
    dedupe: `keeper_approved:${profileId}`,
    data: { dashboardUrl: `${appUrl()}/dashboard`, payments: mode === "unavailable" ? null : mode === "paid" },
  });
}

export async function notifyNewReview(c: BookingCtx, rating: number, comment: string | null) {
  if (!c.keeper.email) return;
  await queueEmail({
    template: "review_received_keeper",
    toEmail: c.keeper.email,
    toUserId: c.keeper.id,
    dedupe: `review:${c.id}`,
    data: { teamName: c.team.name, rating, comment, pitch: c.pitch, profileUrl: `${appUrl()}/keepers/${c.keeper.id}` },
  });
}

/** Cancela el aviso de mensaje pendiente de este usuario en este hilo (lo ha leído o ha contestado). */
export async function cancelChatNotice(applicationId: string, userId: string) {
  await cancelEmails(chatKey(applicationId, userId));
}

/** Mensaje enviado: aviso al otro participante a los 10 minutos si sigue sin leerlo, sin el texto del mensaje. */
export async function notifyUnreadMessage(applicationId: string, senderId: string, messageId: string) {
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("applications")
    .select("id, goalkeeper_id, status, matches(created_by, address, status)")
    .eq("id", applicationId)
    .maybeSingle();
  const match = (a?.matches ?? null) as (Pick<MatchRow, "created_by" | "address"> & { status: string }) | null;
  if (!a || !match) return;
  if (a.status === "rejected" || a.status === "withdrawn" || match.status === "cancelled") return;

  let recipientId: string;
  if (senderId === match.created_by) recipientId = a.goalkeeper_id;
  else if (senderId === a.goalkeeper_id) recipientId = match.created_by;
  else return;

  const { data: msg } = await admin.from("messages").select("created_at").eq("id", messageId).maybeSingle();
  if (!msg) return;
  const messageAt = new Date(msg.created_at);

  const isRead = async () => {
    const { data } = await admin
      .from("message_reads")
      .select("last_read_at")
      .eq("application_id", applicationId)
      .eq("user_id", recipientId)
      .maybeSingle();
    return readAfter(data ? new Date(data.last_read_at) : null, messageAt);
  };
  if (await isRead()) return;

  const key = chatKey(applicationId, recipientId);
  const { data: last } = await admin
    .from("email_outbox")
    .select("created_at")
    .like("dedupe_key", `${key}%`)
    .in("status", ["pending", "sending", "scheduled", "sent"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!chatNoticeAllowed(last ? new Date(last.created_at) : null, new Date())) return;

  const [recipient, sender] = await Promise.all([partyOf(recipientId, "Someone"), partyOf(senderId, "Someone")]);
  if (!recipient.email) return;
  await queueEmail({
    template: "chat_unread",
    toEmail: recipient.email,
    toUserId: recipient.id,
    dedupe: `${key}${messageId}`,
    sendAfter: new Date(Date.now() + CHAT_DELAY_MS),
    data: { senderName: sender.name, pitch: splitAddress(match.address).name, chatUrl: `${appUrl()}/messages/${applicationId}` },
  });

  // Si lo leyó mientras se programaba, el aviso ya no tiene sentido.
  if (await isRead()) await cancelEmails(key);
}
