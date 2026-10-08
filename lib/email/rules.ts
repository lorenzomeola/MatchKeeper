// Reglas puras del envío de emails (sin dependencias, probadas con `npm test`).

/** Resend permite programar un envío hasta 30 días por delante; con margen. */
export const MAX_SCHEDULE_DAYS = 29;
/** Por debajo de este margen se envía ya en vez de programar. */
export const SEND_NOW_WINDOW_MS = 60_000;
export const MAX_ATTEMPTS = 5;

const MINUTE = 60_000;

/** Cuánto esperar antes del intento siguiente: 2, 10, 30, 120 minutos. */
export function retryDelayMs(attemptsSoFar: number): number {
  const steps = [2, 10, 30, 120];
  return steps[Math.min(Math.max(attemptsSoFar - 1, 0), steps.length - 1)] * MINUTE;
}

export type SendPlan = { kind: "now" } | { kind: "schedule"; at: Date } | { kind: "later" };

/** Ahora, programado en Resend o esperar a que la tarea periódica lo recoja (más de 30 días). */
export function planSend(sendAfter: Date, now: Date): SendPlan {
  const delta = sendAfter.getTime() - now.getTime();
  if (delta <= SEND_NOW_WINDOW_MS) return { kind: "now" };
  if (delta > MAX_SCHEDULE_DAYS * 24 * 60 * MINUTE) return { kind: "later" };
  return { kind: "schedule", at: sendAfter };
}

export type FailureKind = "retry" | "permanent";

/** Un fallo de red, de límite o del servidor se reintenta; un error de datos o de cuenta no tiene arreglo reintentando. */
export function classifyFailure(err: { statusCode: number | null; name?: string }): FailureKind {
  const { statusCode, name } = err;
  if (name === "rate_limit_exceeded" || name === "concurrent_idempotent_requests") return "retry";
  if (name === "daily_quota_exceeded") return "retry";
  if (statusCode == null || statusCode >= 500 || statusCode === 429) return "retry";
  return "permanent";
}

/** Con `redirectTo` (desarrollo y staging) todo se entrega a esa dirección y el asunto dice a quién iba. */
export function applyRedirect(to: string, subject: string, redirectTo: string | undefined) {
  const target = redirectTo?.trim();
  if (!target) return { to, subject };
  return { to: target, subject: `[to: ${to}] ${subject}` };
}

/** Clave única de un aviso: la misma plantilla sobre la misma entidad no se manda dos veces. */
export function dedupeKey(template: string, ...parts: (string | number)[]): string {
  return [template, ...parts].join(":");
}
