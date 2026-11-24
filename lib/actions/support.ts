"use server";

import { revalidatePath } from "next/cache";
import { defer } from "@/lib/email/booking-emails";
import { cancelSupportNotice, notifySupportMessage } from "@/lib/email/support-emails";
import type { SupportMessage } from "@/lib/data/support";
import { firstName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { fillTemplate } from "@/lib/support-templates";

export type SupportSendState = { error: string | null; message?: SupportMessage };

/** Las reglas (quién puede escribir, límites) viven en send_support_message(); aquí solo se programa el aviso. */
export async function sendSupportMessageAction(keeperId: string, body: string): Promise<SupportSendState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { data, error } = await supabase.rpc("send_support_message", { p_keeper_id: keeperId, p_body: body });
  if (error) return { error: error.message };

  const message = data as SupportMessage;
  defer(async () => {
    await cancelSupportNotice(keeperId, message.from_admin ? "admin" : "keeper");
    await notifySupportMessage(keeperId, message.id);
  });
  return { error: null, message };
}

export async function markSupportReadAction(keeperId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase.rpc("mark_support_read", { p_keeper_id: keeperId });
  if (error) return { error: error.message };

  defer(() => cancelSupportNotice(keeperId, user.id === keeperId ? "keeper" : "admin"));
  return { error: null };
}

/** El mismo mensaje a todos los porteros aprobados, cada uno en su hilo; {name} se cambia por su nombre. */
export async function broadcastSupportMessageAction(body: string): Promise<{ error: string | null; sent?: number; failed?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return { error: "Not authorized." };

  const text = body.trim();
  if (text.length < 10) return { error: "Write the message first (at least 10 characters)." };

  const { data: keepers, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "goalkeeper")
    .eq("approved", true)
    .neq("id", user.id);
  if (error) return { error: "We couldn't load the keepers. Try again." };
  if (!keepers?.length) return { error: "There are no approved keepers yet." };

  const drafts = keepers.map((k) => ({ id: k.id, body: fillTemplate(text, { name: firstName(k.display_name) }) }));
  if (drafts.some((d) => d.body.length > 1000)) return { error: "The message is too long once names are added. Keep it under 1000 characters." };

  const sent: { keeperId: string; messageId: string }[] = [];
  for (const d of drafts) {
    const { data, error: sendError } = await supabase.rpc("send_support_message", { p_keeper_id: d.id, p_body: d.body });
    if (sendError || !data) {
      console.error(`broadcast to ${d.id} failed`, sendError);
      continue;
    }
    sent.push({ keeperId: d.id, messageId: (data as SupportMessage).id });
  }

  defer(async () => {
    for (const s of sent) await notifySupportMessage(s.keeperId, s.messageId);
  });
  revalidatePath("/admin/inbox");
  return { error: null, sent: sent.length, failed: drafts.length - sent.length };
}

export async function setMatchDigestAction(enabled: boolean): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase.from("profiles").update({ match_digest: enabled }).eq("id", user.id);
  if (error) {
    console.error("setMatchDigestAction failed", error);
    return { error: "We couldn't save that. Try again." };
  }
  revalidatePath("/profile");
  return { error: null };
}
