"use server";

import { defer } from "@/lib/email/booking-emails";
import { notifyAdminReport } from "@/lib/email/admin-emails";
import { cancelChatNotice, notifyUnreadMessage } from "@/lib/email/marketplace-emails";
import type { ChatMessage } from "@/lib/data/messages";
import { createClient } from "@/lib/supabase/server";

export type SendMessageState = { error: string | null; message?: ChatMessage };

/** Envía por la misma función SQL de siempre (sus reglas y RLS no cambian) y deja programado el aviso por email. */
export async function sendMessageAction(applicationId: string, body: string): Promise<SendMessageState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { data, error } = await supabase.rpc("send_message", { p_application_id: applicationId, p_body: body });
  if (error) return { error: error.message };

  const message = data as ChatMessage;
  defer(async () => {
    // Quien escribe ya está al día: su propio aviso pendiente en este hilo sobra.
    await cancelChatNotice(applicationId, user.id);
    await notifyUnreadMessage(applicationId, user.id, message.id);
  });
  return { error: null, message };
}

export async function markThreadReadAction(applicationId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase.rpc("mark_thread_read", { p_application_id: applicationId });
  if (error) return { error: error.message };

  defer(() => cancelChatNotice(applicationId, user.id));
  return { error: null };
}

/** Misma inserción de siempre (RLS: solo como uno mismo), pero pasando por el servidor para avisar al admin. */
export async function reportUserAction(input: {
  reportedId: string;
  applicationId: string;
  reason: string;
  details: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const reason = input.reason.trim();
  const details = input.details.trim();
  if (!reason || reason.length > 200 || details.length > 500) return { error: "Invalid report." };

  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: user.id,
      reported_id: input.reportedId,
      application_id: input.applicationId,
      reason,
      details: details || null,
    })
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };

  if (data) defer(() => notifyAdminReport(data.id));
  return { error: null };
}
