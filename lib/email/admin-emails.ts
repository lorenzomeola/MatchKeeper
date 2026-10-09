import "server-only";
import { longDate, moneyPence } from "@/lib/format";
import { appUrl } from "@/lib/payments/app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBookingContext, partyOf, type BookingCtx } from "./booking-context";
import type { PaymentProblemKind } from "./admin-templates";
import { queueEmail } from "./outbox";
import type { TemplateData, TemplateName } from "./templates";

type AdminTemplate = Extract<TemplateName, `admin_${string}`>;

/** Un solo destinatario: ADMIN_EMAIL. Sin él no se envía nada, y nunca se rompe el flujo que lo origina. */
async function toAdmin<K extends AdminTemplate>(template: K, dedupe: string, data: TemplateData[K]) {
  const to = process.env.ADMIN_EMAIL?.trim();
  if (!to) return;
  await queueEmail({ template, toEmail: to, dedupe, data });
}

const adminUrl = (path: string) => `${appUrl()}/admin/${path}`;

export async function notifyAdminNewKeeper(profileId: string) {
  const { data: p } = await createAdminClient().from("profiles").select("display_name, city, role").eq("id", profileId).maybeSingle();
  if (p?.role !== "goalkeeper") return;
  await toAdmin("admin_new_keeper", `admin:new_keeper:${profileId}`, { name: p.display_name, city: p.city, adminUrl: adminUrl("goalkeepers") });
}

export async function notifyAdminDispute(d: { stripeId: string; amountPence: number; reason: string; status: string; dueBy: Date | null; matched: boolean }) {
  await toAdmin("admin_dispute", `admin:dispute:${d.stripeId}`, {
    inquiry: d.status.startsWith("warning_"),
    amount: moneyPence(d.amountPence),
    reason: d.reason.replace(/_/g, " "),
    dueBy: d.dueBy ? longDate(d.dueBy.toISOString()) : null,
    matched: d.matched,
    adminUrl: adminUrl("disputes"),
  });
}

export async function notifyAdminBookingReview(c: BookingCtx, reason: string) {
  await toAdmin("admin_booking_review", `admin:review:${c.id}`, {
    reason,
    pitch: c.pitch,
    when: c.when,
    keeperName: c.keeper.name,
    teamName: c.team.name,
    amount: moneyPence(c.totalPence),
    adminUrl: adminUrl("payments"),
  });
}

export async function notifyAdminReport(reportId: string) {
  const admin = createAdminClient();
  const { data: r } = await admin.from("reports").select("reporter_id, reported_id, reason, details").eq("id", reportId).maybeSingle();
  if (!r) return;
  const [reporter, reported] = await Promise.all([partyOf(r.reporter_id, "A user"), partyOf(r.reported_id, "A user")]);
  await toAdmin("admin_report", `admin:report:${reportId}`, {
    reporterName: reporter.name,
    reportedName: reported.name,
    reason: r.reason,
    details: r.details,
    adminUrl: adminUrl(`reports/${reportId}`),
  });
}

/** Solo avisa al llegar a "revisión" o "suspendido"; cada cambio de puntos es un aviso nuevo. */
export async function notifyAdminKeeperStanding(c: BookingCtx, standing: { level: string; points: number; removalCandidate: boolean }) {
  if (standing.level !== "review" && standing.level !== "suspended") return;
  await toAdmin("admin_keeper_standing", `admin:standing:${c.keeper.id}:${standing.level}:${standing.points}`, {
    keeperName: c.keeper.name,
    level: standing.level,
    points: standing.points,
    removalCandidate: standing.removalCandidate,
    adminUrl: adminUrl("strikes"),
  });
}

/** Dinero que no se pudo mover. Un aviso por reserva y tipo, aunque el reintento diario vuelva a fallar. */
export async function notifyAdminPaymentProblem(bookingId: string, kind: PaymentProblemKind, error: unknown) {
  const c = await loadBookingContext(bookingId);
  if (!c) return;
  const detail = error instanceof Error ? error.message : error ? String(error) : null;
  await toAdmin("admin_payment_problem", `admin:payment_problem:${kind}:${c.id}`, {
    kind,
    pitch: c.pitch,
    keeperName: c.keeper.name,
    teamName: c.team.name,
    detail: detail ? detail.slice(0, 300) : null,
    adminUrl: adminUrl("payments"),
  });
}
