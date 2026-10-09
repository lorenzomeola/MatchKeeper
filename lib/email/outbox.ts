import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTACT_EMAIL } from "@/lib/site";
import { appUrl } from "@/lib/payments/app-url";
import { fromAddress, getResend } from "./resend";
import {
  MAX_ATTEMPTS,
  MAX_SCHEDULE_DAYS,
  applyRedirect,
  classifyFailure,
  planSend,
  retryDelayMs,
} from "./rules";
import { renderEmail, type TemplateData, type TemplateName } from "./templates";

type Row = {
  id: string;
  dedupe_key: string;
  template: string;
  to_email: string;
  payload: unknown;
  send_after: string;
  status: string;
  attempts: number;
};

const COLUMNS = "id, dedupe_key, template, to_email, payload, send_after, status, attempts";
const STALE_CLAIM_MS = 10 * 60_000;

export type EnqueueInput<K extends TemplateName> = {
  template: K;
  data: TemplateData[K];
  toEmail: string;
  toUserId?: string | null;
  /** Clave única del aviso; si ya existe no se vuelve a crear. */
  dedupe: string;
  /** Cuándo debe llegar; por defecto, ya. */
  sendAfter?: Date;
};

/**
 * Anota un email y lo manda (o lo programa en Resend). Nunca lanza: un fallo de email no debe romper un pago ni
 * una reserva. Si Resend falla, queda anotado y la tarea periódica lo reintenta.
 */
export async function queueEmail<K extends TemplateName>(input: EnqueueInput<K>): Promise<void> {
  try {
    const { data, error } = await createAdminClient()
      .from("email_outbox")
      .upsert(
        {
          dedupe_key: input.dedupe,
          template: input.template,
          to_email: input.toEmail,
          to_user_id: input.toUserId ?? null,
          payload: input.data,
          send_after: (input.sendAfter ?? new Date()).toISOString(),
        },
        { onConflict: "dedupe_key", ignoreDuplicates: true },
      )
      .select("id")
      .maybeSingle();
    if (error) throw error;
    // Sin fila devuelta: ya existía este aviso.
    if (data) await dispatchEmail(data.id);
  } catch (e) {
    console.error(`queueEmail failed for ${input.dedupe}`, e);
  }
}

/** Reclama la fila, la manda o la programa en Resend y deja el resultado anotado. */
export async function dispatchEmail(id: string): Promise<"sent" | "scheduled" | "retry" | "failed" | "skipped"> {
  const admin = createAdminClient();
  const now = new Date();

  const { data: row } = await admin
    .from("email_outbox")
    .update({ status: "sending", claimed_at: now.toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select(COLUMNS)
    .maybeSingle();
  // Otro proceso ya lo reclamó o ya no está pendiente.
  if (!row) return "skipped";
  const r = row as Row;

  const plan = planSend(new Date(r.send_after), now);
  if (plan.kind === "later") {
    await admin.from("email_outbox").update({ status: "pending", claimed_at: null }).eq("id", id);
    return "skipped";
  }

  const attempts = r.attempts + 1;
  try {
    const rendered = renderEmail(r.template as TemplateName, r.payload as never, {
      siteUrl: appUrl(),
      contactEmail: CONTACT_EMAIL,
    });
    const { to, subject } = applyRedirect(r.to_email, rendered.subject, process.env.EMAIL_REDIRECT_TO);
    const { data, error } = await getResend().emails.send(
      {
        from: fromAddress(),
        to,
        subject,
        html: rendered.html,
        text: rendered.text,
        ...(rendered.replyTo ? { replyTo: rendered.replyTo } : {}),
        ...(plan.kind === "schedule" ? { scheduledAt: plan.at.toISOString() } : {}),
      },
      { idempotencyKey: r.dedupe_key },
    );

    // 409 con otro contenido: Resend ya aceptó este aviso en un intento anterior.
    if (error && error.name === "invalid_idempotent_request") {
      await admin
        .from("email_outbox")
        .update({ status: "sent", attempts, claimed_at: null, sent_at: now.toISOString(), last_error: null })
        .eq("id", id);
      return "sent";
    }
    if (error) return await recordFailure(id, attempts, error.message, classifyFailure(error), now);

    const scheduled = plan.kind === "schedule";
    await admin
      .from("email_outbox")
      .update({
        status: scheduled ? "scheduled" : "sent",
        attempts,
        provider_id: data?.id ?? null,
        claimed_at: null,
        sent_at: scheduled ? null : now.toISOString(),
        last_error: null,
      })
      .eq("id", id);
    return scheduled ? "scheduled" : "sent";
  } catch (e) {
    // Plantilla desconocida, datos mal formados o fallo de red: los de datos no se arreglan reintentando.
    const message = e instanceof Error ? e.message : String(e);
    const kind = /Unknown email template|RESEND_API_KEY/.test(message) ? "permanent" : "retry";
    return await recordFailure(id, attempts, message, kind, now);
  }
}

async function recordFailure(
  id: string,
  attempts: number,
  message: string,
  kind: "retry" | "permanent",
  now: Date,
): Promise<"retry" | "failed"> {
  const giveUp = kind === "permanent" || attempts >= MAX_ATTEMPTS;
  await createAdminClient()
    .from("email_outbox")
    .update(
      giveUp
        ? { status: "failed", attempts, claimed_at: null, last_error: message.slice(0, 500) }
        : {
            status: "pending",
            attempts,
            claimed_at: null,
            send_after: new Date(now.getTime() + retryDelayMs(attempts)).toISOString(),
            last_error: message.slice(0, 500),
          },
    )
    .eq("id", id);
  if (giveUp) console.error(`email ${id} failed for good: ${message}`);
  return giveUp ? "failed" : "retry";
}

/** Envía lo pendiente que ya toca (reintentos y avisos anotados fuera de plazo). Idempotente. */
export async function drainOutbox(limit = 50) {
  const admin = createAdminClient();
  const now = new Date();

  // Un envío reclamado hace rato y nunca terminado (el proceso murió) vuelve a la cola.
  await admin
    .from("email_outbox")
    .update({ status: "pending", claimed_at: null })
    .eq("status", "sending")
    .lt("claimed_at", new Date(now.getTime() - STALE_CLAIM_MS).toISOString());

  const horizon = new Date(now.getTime() + MAX_SCHEDULE_DAYS * 24 * 3_600_000).toISOString();
  const { data: due, error } = await admin
    .from("email_outbox")
    .select("id")
    .eq("status", "pending")
    .lte("send_after", horizon)
    .order("send_after", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const summary = { sent: 0, scheduled: 0, retry: 0, failed: 0, skipped: 0 };
  for (const { id } of due ?? []) summary[await dispatchEmail(id)]++;
  return summary;
}

/**
 * Cancela los avisos programados cuya clave empieza por `keyPrefix` (p. ej. los recordatorios de una reserva
 * que se cancela). Los que Resend ya envió se dejan como están.
 */
export async function cancelEmails(keyPrefix: string): Promise<number> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("email_outbox")
    .select("id, status, provider_id")
    .like("dedupe_key", `${keyPrefix}%`)
    .in("status", ["pending", "scheduled"]);
  if (error) throw error;

  let cancelled = 0;
  for (const r of rows ?? []) {
    if (r.status === "scheduled" && r.provider_id) {
      const { error: cancelError } = await getResend().emails.cancel(r.provider_id);
      // Si Resend ya lo envió no se puede cancelar: se deja como enviado.
      if (cancelError) {
        await admin.from("email_outbox").update({ status: "sent" }).eq("id", r.id).eq("status", "scheduled");
        continue;
      }
    }
    await admin.from("email_outbox").update({ status: "cancelled" }).eq("id", r.id).in("status", ["pending", "scheduled"]);
    cancelled++;
  }
  return cancelled;
}
