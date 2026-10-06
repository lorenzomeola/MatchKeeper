import Link from "next/link";
import type { Metadata } from "next";
import { DisputeActions, WaiveDebtButton } from "@/components/app/admin-dispute-actions";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { ShieldCheckIcon } from "@/components/platform/icons";
import { loadDisputes } from "@/lib/data/admin";
import { longDate, moneyPence } from "@/lib/format";
import { disputeRatioPct, dueState, RESPONDABLE_STATUSES } from "@/lib/payments/disputes";

export const metadata: Metadata = { title: "Disputes", robots: { index: false } };

const STATUS: Record<string, { label: string; tone: "success" | "danger" | "warning" | "neutral" | "accent" }> = {
  needs_response: { label: "Needs response", tone: "warning" },
  warning_needs_response: { label: "Inquiry: needs response", tone: "warning" },
  under_review: { label: "Under review", tone: "accent" },
  warning_under_review: { label: "Inquiry: under review", tone: "accent" },
  won: { label: "Won", tone: "success" },
  lost: { label: "Lost", tone: "danger" },
  warning_closed: { label: "Inquiry closed", tone: "neutral" },
};

export default async function AdminDisputesPage() {
  const { disputes, ratio } = await loadDisputes();
  const pct = disputeRatioPct(ratio.disputes, ratio.paidBookings);
  const now = new Date();

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Disputes"
        description="Card disputes opened by a team with its bank. The evidence is prepared for you: check it, then send it. Answering and losing costs another £20, so only answer when the proof is good."
      />

      <section className="pl-surface mb-6 rounded-[var(--r-lg)] p-4 sm:p-5">
        <p className="text-sm font-semibold text-fg">Last 90 days</p>
        <p className="mt-1 text-sm text-muted">
          {ratio.disputes} {ratio.disputes === 1 ? "dispute" : "disputes"} on {ratio.paidBookings} paid bookings:{" "}
          <span className={`font-semibold ${pct >= 0.75 ? "text-danger" : "text-fg"}`}>{pct}%</span>. Card networks start to worry around 1%, and with few bookings a single dispute moves it a lot.
        </p>
      </section>

      {disputes.length === 0 ? (
        <EmptyState icon={ShieldCheckIcon} title="No disputes" body="Disputes opened with a bank appear here as soon as Stripe tells us." />
      ) : (
        <ul className="grid gap-4">
          {disputes.map((d) => {
            const s = STATUS[d.status] ?? { label: d.status, tone: "neutral" as const };
            const due = dueState(d.dueBy ? new Date(d.dueBy) : null, now);
            const canRespond = RESPONDABLE_STATUSES.includes(d.status) && !d.evidenceSubmittedAt;
            return (
              <li key={d.id} className="pl-surface rounded-[var(--r-lg)] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-fg">
                      {moneyPence(d.amountPence)} · {d.reason?.replaceAll("_", " ") ?? "dispute"}
                    </p>
                    <p className="text-sm text-muted">
                      {d.teamName} booked {d.keeperName}
                      {d.address ? ` · ${d.address}` : ""}
                      {d.startsAt ? ` · ${longDate(d.startsAt)}` : ""}
                    </p>
                    {d.matchId && (
                      <Link href={`/matches/${d.matchId}`} className="text-xs font-semibold text-accent-strong underline underline-offset-4">
                        Open the match
                      </Link>
                    )}
                  </div>
                  <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                </div>

                {d.dueBy && canRespond && (
                  <p className={`mt-3 text-sm font-medium ${due === "overdue" ? "text-danger" : due === "urgent" ? "text-warning" : "text-fg-2"}`}>
                    {due === "overdue" ? "The deadline has passed: " : "Respond before "}
                    {longDate(d.dueBy)}
                  </p>
                )}
                {d.evidenceSubmittedAt && <p className="mt-3 text-sm text-fg-2">Evidence sent on {longDate(d.evidenceSubmittedAt)}.</p>}

                {d.evidence ? (
                  <div className="mt-3 rounded-[var(--r-md)] bg-surface px-3 py-3">
                    <p className="text-xs font-semibold text-muted">How strong is the proof</p>
                    <ul className="mt-1.5 grid gap-1 text-sm">
                      {d.evidence.checks.map((c) => (
                        <li key={c.label} className={c.ok ? "text-fg" : "text-muted"}>
                          {c.ok ? "Yes" : "No"} · {c.label}
                        </li>
                      ))}
                    </ul>
                    <details className="mt-2">
                      <summary className="min-h-11 cursor-pointer text-sm font-semibold text-accent-strong">Read the evidence that will be sent</summary>
                      <div className="mt-2 grid gap-3 text-xs text-fg-2">
                        {Object.entries(d.evidence.stripe).map(([k, v]) => (
                          <div key={k}>
                            <p className="font-semibold text-muted">{k.replaceAll("_", " ")}</p>
                            <pre className="mt-0.5 whitespace-pre-wrap break-words font-sans">{v}</pre>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">The evidence is not ready yet.{canRespond ? " Use “Prepare evidence again”." : ""}</p>
                )}

                {(d.reversedPence > 0 || d.debts.length > 0 || d.reversalError || d.retransferredAt) && (
                  <div className="mt-3 rounded-[var(--r-md)] border border-line px-3 py-2 text-sm text-fg-2">
                    <p className="font-medium text-fg">Recovery from the keeper</p>
                    {d.reversedPence > 0 && <p>Payout reversed: {moneyPence(d.reversedPence)}.</p>}
                    {d.reversalError && <p className="text-muted">Stripe could not reverse the payout: {d.reversalError}</p>}
                    {d.debts.map((x) => (
                      <p key={x.id} className="flex flex-wrap items-center gap-2">
                        Debt {moneyPence(x.amountPence)}, recovered {moneyPence(x.recoveredPence)} ({x.status}).
                        {x.status === "open" && <WaiveDebtButton debtId={x.id} />}
                      </p>
                    ))}
                    {d.retransferredAt && <p>Dispute won: the keeper was paid back on {longDate(d.retransferredAt)}.</p>}
                  </div>
                )}

                <DisputeActions disputeId={d.id} fault={d.fault} canRespond={canRespond} hasEvidence={Boolean(d.evidence)} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
