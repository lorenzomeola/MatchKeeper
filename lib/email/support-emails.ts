import "server-only";
import { appUrl } from "@/lib/payments/app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { partyOf } from "./booking-context";
import { CHAT_DELAY_MS, adminSupportKey, chatNoticeAllowed, readAfter, supportKey } from "./chat-rules";
import { cancelEmails, queueEmail } from "./outbox";

type Side = "keeper" | "admin";

/** El portero (o el buzón de admins) ya está al día: su aviso pendiente sobra. */
export async function cancelSupportNotice(keeperId: string, reader: Side) {
  await cancelEmails(reader === "keeper" ? supportKey(keeperId) : adminSupportKey(keeperId));
}

/**
 * Mismo criterio que el chat de partidos: aviso a los 10 minutos si sigue sin leerse, como mucho uno por hora,
 * y sin el texto del mensaje.
 */
export async function notifySupportMessage(keeperId: string, messageId: string) {
  const admin = createAdminClient();
  const { data: msg } = await admin
    .from("support_messages")
    .select("created_at, from_admin")
    .eq("id", messageId)
    .eq("keeper_id", keeperId)
    .maybeSingle();
  if (!msg) return;
  const recipient: Side = msg.from_admin ? "keeper" : "admin";
  const messageAt = new Date(msg.created_at);

  const isRead = async () => {
    const { data } = await admin.from("support_threads").select("keeper_read_at, admin_read_at").eq("keeper_id", keeperId).maybeSingle();
    const at = recipient === "keeper" ? data?.keeper_read_at : data?.admin_read_at;
    return readAfter(at ? new Date(at) : null, messageAt);
  };
  if (await isRead()) return;

  const key = recipient === "keeper" ? supportKey(keeperId) : adminSupportKey(keeperId);
  const { data: last } = await admin
    .from("email_outbox")
    .select("created_at")
    .like("dedupe_key", `${key}%`)
    .in("status", ["pending", "sending", "scheduled", "sent"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!chatNoticeAllowed(last ? new Date(last.created_at) : null, new Date())) return;

  const sendAfter = new Date(Date.now() + CHAT_DELAY_MS);
  const keeper = await partyOf(keeperId, "A keeper");
  if (recipient === "keeper") {
    if (!keeper.email) return;
    await queueEmail({
      template: "support_unread",
      toEmail: keeper.email,
      toUserId: keeper.id,
      dedupe: `${key}${messageId}`,
      sendAfter,
      data: { chatUrl: `${appUrl()}/messages/support` },
    });
  } else {
    const to = process.env.ADMIN_EMAIL?.trim();
    if (!to) return;
    await queueEmail({
      template: "admin_support_reply",
      toEmail: to,
      dedupe: `${key}${messageId}`,
      sendAfter,
      data: { keeperName: keeper.name, adminUrl: `${appUrl()}/admin/inbox/${keeperId}` },
    });
  }

  // Si lo leyó mientras se programaba, el aviso ya no tiene sentido.
  if (await isRead()) await cancelEmails(key);
}
