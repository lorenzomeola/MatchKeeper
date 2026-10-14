// Plantillas de los avisos al admin. Van en inglés y con enlace directo a la pantalla de admin que toca.
import type { LayoutInput } from "./templates.ts";

export type PaymentProblemKind = "cancellation" | "release" | "refund_after_payout";

export type AdminTemplateData = {
  admin_new_keeper: { name: string; city: string | null; adminUrl: string };
  admin_dispute: { inquiry: boolean; amount: string; reason: string; dueBy: string | null; matched: boolean; adminUrl: string };
  admin_booking_review: { reason: string; pitch: string; when: string; keeperName: string; teamName: string; amount: string; adminUrl: string };
  admin_report: { reporterName: string; reportedName: string; reason: string; details: string | null; adminUrl: string };
  admin_keeper_standing: { keeperName: string; level: "review" | "suspended"; points: number; removalCandidate: boolean; adminUrl: string };
  admin_payment_problem: { kind: PaymentProblemKind; pitch: string; keeperName: string; teamName: string; detail: string | null; adminUrl: string };
};

const REVIEW_REASONS: Record<string, string> = {
  no_checkin_no_response: "The keeper did not check in and the team did not respond.",
  team_reported_no_show: "The team reported a no-show, but the keeper had checked in.",
  team_reported_other: "The team reported a problem with the match.",
  refunded_in_stripe: "The payment was refunded directly in Stripe.",
};

export const reviewReasonText = (reason: string) => REVIEW_REASONS[reason] ?? `Moved to review (${reason}).`;

const PROBLEMS: Record<PaymentProblemKind, { title: string; what: string }> = {
  cancellation: {
    title: "Cancellation money is stuck",
    what: "The booking was cancelled, but the refund or the payment to the keeper did not go through. The daily job retries it.",
  },
  release: {
    title: "Keeper payment failed",
    what: "The payment to the keeper did not go through. The daily job retries it.",
  },
  refund_after_payout: {
    title: "Refund after the keeper was paid",
    what: "The payment was refunded in Stripe after the keeper had already been paid. No transfer could be reversed automatically.",
  },
};

type Ctx = { siteUrl: string };
type Builder<K extends keyof AdminTemplateData> = (d: AdminTemplateData[K], ctx: Ctx) => LayoutInput;

export const ADMIN_BUILDERS: { [K in keyof AdminTemplateData]: Builder<K> } = {
  admin_new_keeper: (d) => ({
    title: "New keeper to approve",
    subject: `[Admin] New keeper: ${d.name}`,
    paragraphs: [
      `${d.name}${d.city ? ` (${d.city})` : ""} signed up as a keeper.`,
      "They may still be filling in their profile. Once it is complete, it is ready for you to approve.",
    ],
    cta: { label: "Review keepers", url: d.adminUrl },
  }),

  admin_dispute: (d) => ({
    title: d.inquiry ? "Payment inquiry received" : "Dispute received",
    subject: `[Admin] ${d.inquiry ? "Payment inquiry" : "Dispute"} for ${d.amount}`,
    paragraphs: [
      `A customer's bank opened ${d.inquiry ? "an inquiry" : "a dispute"} for ${d.amount}. Reason: ${d.reason}.`,
      d.dueBy ? `Evidence is due by ${d.dueBy}.` : "There is no evidence deadline yet.",
      d.matched
        ? "The booking is marked as disputed and the evidence is ready to review."
        : "No booking matches this payment. Check it in Stripe.",
    ],
    cta: { label: "Open disputes", url: d.adminUrl },
  }),

  admin_booking_review: (d) => ({
    title: "A booking needs your review",
    subject: `[Admin] Booking needs review: ${d.pitch}`,
    paragraphs: [
      `${d.keeperName} for ${d.teamName} at ${d.pitch}.`,
      d.when,
      reviewReasonText(d.reason),
      `No transfer has been made while this booking is under review (${d.amount}).`,
    ],
    cta: { label: "Review the booking", url: d.adminUrl },
  }),

  admin_report: (d) => ({
    title: "New report",
    subject: `[Admin] ${d.reporterName} reported ${d.reportedName}`,
    paragraphs: [
      `${d.reporterName} reported ${d.reportedName}.`,
      `Reason: ${d.reason}`,
      ...(d.details ? [`Details: ${d.details}`] : []),
    ],
    cta: { label: "Open the report", url: d.adminUrl },
  }),

  admin_keeper_standing: (d) => ({
    title: d.level === "suspended" ? "A keeper was suspended" : "A keeper needs review",
    subject: `[Admin] ${d.keeperName} is ${d.level === "suspended" ? "suspended" : "at review level"}`,
    paragraphs: [
      `${d.keeperName} now has ${d.points} strike points.`,
      d.level === "suspended"
        ? "They can no longer apply to new matches, and their upcoming bookings need attention."
        : "A strike put them at the review level.",
      ...(d.removalCandidate ? ["They have two active no-shows: a candidate for permanent removal."] : []),
    ],
    cta: { label: "Open strikes", url: d.adminUrl },
  }),

  admin_payment_problem: (d) => ({
    title: PROBLEMS[d.kind].title,
    subject: `[Admin] ${PROBLEMS[d.kind].title}: ${d.pitch}`,
    paragraphs: [
      `${d.keeperName} for ${d.teamName} at ${d.pitch}.`,
      PROBLEMS[d.kind].what,
      ...(d.detail ? [`Error: ${d.detail}`] : []),
    ],
    cta: { label: "Open payments", url: d.adminUrl },
  }),
};
