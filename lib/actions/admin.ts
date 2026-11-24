"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { defer } from "@/lib/email/booking-emails";
import { notifyKeeperApproved } from "@/lib/email/marketplace-emails";
import { queueEmail } from "@/lib/email/outbox";
import { firstName } from "@/lib/format";
import { appUrl } from "@/lib/payments/app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SUPPORT_TEMPLATES, fillTemplate } from "@/lib/support-templates";

export type AdminActionState = { error: string | null; done?: boolean };

export async function setKeeperApprovalAction(profileId: string, approved: boolean): Promise<AdminActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_keeper_approval", { p_profile: profileId, p_approved: approved });
  if (error) {
    console.error("setKeeperApprovalAction failed", error);
    return { error: "We couldn't update this keeper. Check that db/admin.sql has been applied." };
  }
  revalidatePath("/admin", "layout");
  if (approved) {
    await sendWelcomeMessage(supabase, profileId);
    defer(() => notifyKeeperApproved(profileId));
  }
  return { error: null, done: true };
}

const WELCOME = SUPPORT_TEMPLATES.find((t) => t.id === "welcome")!.body;

/** Bienvenida en el chat al aprobar, una sola vez. Sin aviso por email: ya le llega el de aprobación. */
async function sendWelcomeMessage(supabase: Awaited<ReturnType<typeof createClient>>, keeperId: string) {
  const opening = WELCOME.slice(0, WELCOME.indexOf("{name}"));
  const { data: sent } = await supabase
    .from("support_messages")
    .select("id")
    .eq("keeper_id", keeperId)
    .eq("from_admin", true)
    .like("body", `${opening}%`)
    .limit(1);
  if (sent?.length) return;

  const { data: keeper } = await supabase.from("profiles").select("display_name").eq("id", keeperId).maybeSingle();
  const body = fillTemplate(WELCOME, { name: firstName(keeper?.display_name), browseLink: `${appUrl()}/map` });
  const { error } = await supabase.rpc("send_support_message", { p_keeper_id: keeperId, p_body: body });
  if (error) console.error("welcome message failed", error);
}

export async function setReportStatusAction(
  reportId: string,
  status: "open" | "reviewed" | "dismissed",
): Promise<AdminActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
  if (error) {
    console.error("setReportStatusAction failed", error);
    return { error: "We couldn't update this report. Check that db/admin.sql has been applied." };
  }
  revalidatePath("/admin", "layout");
  return { error: null, done: true };
}

const QUESTION_MIN = 10;
const QUESTION_MAX = 1000;

/** El admin pregunta algo a un portero antes de aprobarlo: va por email y las respuestas llegan al admin. */
export async function requestKeeperInfoAction(profileId: string, question: string): Promise<AdminActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return { error: "Not authorized." };

  const text = question.trim();
  if (text.length < QUESTION_MIN) return { error: "Write your question first (at least 10 characters)." };
  if (text.length > QUESTION_MAX) return { error: `Keep the question under ${QUESTION_MAX} characters.` };

  const admin = createAdminClient();
  const { data: keeper } = await admin.from("profiles").select("id, role").eq("id", profileId).maybeSingle();
  if (!keeper || keeper.role !== "goalkeeper") return { error: "We couldn't find this keeper." };
  const { data: auth } = await admin.auth.admin.getUserById(profileId);
  const to = auth?.user?.email;
  if (!to) return { error: "This keeper has no email address." };

  // Las respuestas llegan a ADMIN_EMAIL, o al propio correo del admin si no está definido.
  const replyTo = process.env.ADMIN_EMAIL?.trim() || user.email;
  if (!replyTo) return { error: "Set ADMIN_EMAIL so the keeper knows where to reply." };

  // Clave por pregunta y tramo de 5 minutos: un doble clic no manda dos veces, repetirla más tarde sí.
  const digest = createHash("sha1").update(text).digest("hex").slice(0, 12);
  const dedupe = `info_request:${profileId}:${digest}:${Math.floor(Date.now() / 300_000)}`;
  await queueEmail({
    template: "keeper_info_request",
    toEmail: to,
    toUserId: profileId,
    dedupe,
    data: { question: text, replyTo, profileUrl: `${appUrl()}/profile` },
  });

  const { data: row } = await admin.from("email_outbox").select("status").eq("dedupe_key", dedupe).maybeSingle();
  if (!row || row.status === "failed") return { error: "We couldn't send the email. Try again." };

  revalidatePath("/admin", "layout");
  return { error: null, done: true };
}