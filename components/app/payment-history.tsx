import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { StripeDashboardButton } from "@/components/app/stripe-dashboard-button";
import { Button } from "@/components/platform/button";
import { WalletIcon } from "@/components/platform/icons";
import { dateTile, longDate, moneyPence, shortDate, splitAddress } from "@/lib/format";
import {
  KEEPER_STATE,
  TEAM_STATE,
  groupByMonth,
  isSettled,
  type KeeperEntry,
  type TeamEntry,
  type keeperSummary,
  type teamSummary,
} from "@/lib/payments/history";

const monthLabel = (monthKey: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${monthKey}-01T00:00:00Z`),
  );

// Un renglón de detalle: etiqueta a la izquierda, importe tabular a la derecha.
function Line({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? "border-t border-line pt-2" : ""}`}>
      <dt className={muted ? "text-muted" : strong ? "font-semibold text-fg" : "text-fg-2"}>{label}</dt>
      <dd className={`pl-tnum ${strong ? "font-semibold text-fg" : muted ? "text-muted" : "text-fg-2"}`}>{value}</dd>
    </div>
  );
}

function Row({
  entry,
  title,
  subtitle,
  badge,
  amount,
  amountHint,
  children,
}: {
  entry: { startsAt: string | null; at: string; address: string | null; matchId: string };
  title: string;
  subtitle: string;
  badge: ReactNode;
  amount: string;
  amountHint?: string;
  children: ReactNode;
}) {
  const t = dateTile(entry.startsAt ?? entry.at);
  return (
    <li>
      <details className="group">
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-surface [&::-webkit-details-marker]:hidden">
          <span className="w-12 shrink-0 text-center leading-none">
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t.weekday}</span>
            <span className="pl-display pl-tnum mt-1 block text-lg text-fg">{t.day}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium text-fg">{title}</span>
            <span className="block truncate text-[13px] text-muted">{subtitle}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="pl-display pl-tnum text-[17px] text-fg">{amount}</span>
            {amountHint && <span className="hidden text-[11px] text-muted sm:block">{amountHint}</span>}
            {badge}
          </span>
        </summary>
        <div className="grid gap-4 border-t border-line bg-surface/40 px-4 py-4 text-sm sm:pl-[4.75rem]">
          {children}
          <p>
            <Link href={`/matches/${entry.matchId}`} className="font-semibold text-accent-strong underline underline-offset-4">
              Open the match
            </Link>
          </p>
        </div>
      </details>
    </li>
  );
}

function MonthBlock({
  monthKey,
  total,
  totalLabel,
  action,
  children,
}: {
  monthKey: string;
  total: string;
  totalLabel: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2 className="pl-display text-fg [font-size:var(--t-xl)]">{monthLabel(monthKey)}</h2>
        <p className="flex items-baseline gap-3 text-[13px] text-muted">
          <span>
            {totalLabel} <span className="pl-tnum font-semibold text-fg">{total}</span>
          </span>
          {action}
        </p>
      </div>
      <ul className="pl-surface divide-y divide-line overflow-hidden rounded-[var(--r-lg)]">{children}</ul>
    </section>
  );
}

const who = (by: string | null, viewer: "team" | "keeper") => {
  if (by === "team") return viewer === "team" ? "You cancelled this booking." : "The team cancelled this booking.";
  if (by === "keeper") return viewer === "keeper" ? "You cancelled this booking." : "The keeper cancelled this booking.";
  return "MatchKeeper cancelled this booking after a report.";
};

// --- Equipo ---

export function TeamPayments({
  entries,
  keeperOf,
  summary,
}: {
  entries: TeamEntry[];
  keeperOf: Map<string, string>;
  summary: ReturnType<typeof teamSummary>;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={WalletIcon}
        title="No payments yet"
        body="When you book a keeper, the payment and its breakdown show up here."
        action={
          <Button href="/matches/new" size="md" withArrow>
            Post a match
          </Button>
        }
      />
    );
  }
  return (
    <>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Spent" value={moneyPence(summary.spentPence)} hint="Matches played and cancellations" tone="accent" />
        <StatCard label="This month" value={moneyPence(summary.spentThisMonthPence)} hint="Spent so far" />
        <StatCard label="Transfer pending" value={moneyPence(summary.heldPence)} hint="Charge received; keeper transfer not sent yet" />
        <StatCard label="Refunded" value={moneyPence(summary.refundedPence)} hint="Back to your card" tone="success" />
      </div>

      {groupByMonth(entries).map(({ monthKey, items }) => (
        <MonthBlock
          key={monthKey}
          monthKey={monthKey}
          totalLabel="Spent"
          total={moneyPence(items.filter(isSettled).reduce((s, e) => s + e.costPence, 0))}
        >
          {items.map((e) => {
            const s = TEAM_STATE[e.state];
            const keeper = keeperOf.get(e.bookingId) ?? "Keeper";
            return (
              <Row
                key={e.bookingId}
                entry={e}
                title={splitAddress(e.address).name}
                subtitle={`With ${keeper}`}
                badge={<StatusBadge tone={s.tone}>{s.label}</StatusBadge>}
                amount={moneyPence(e.costPence)}
                amountHint={e.refundPence > 0 ? `of ${moneyPence(e.totalPence)} paid` : undefined}
              >
                <dl className="grid max-w-md gap-1.5">
                  <Line label="Keeper rate" value={moneyPence(e.ratePence)} />
                  <Line label="Service fee" value={moneyPence(e.feePence)} />
                  <Line label="You paid" value={moneyPence(e.totalPence)} strong={e.refundPence === 0} />
                  {e.refundPence > 0 && (
                    <>
                      <Line label="Refunded to your card" value={`-${moneyPence(e.refundPence)}`} />
                      <Line label="Final cost" value={moneyPence(e.costPence)} strong />
                    </>
                  )}
                </dl>
                <p className="pl-prose text-[14px]">{teamNote(e)}</p>
              </Row>
            );
          })}
        </MonthBlock>
      ))}
      <p className="mt-8 text-[13px] leading-relaxed text-muted">
        Payments are made to MatchKeeper. The keeper is paid only after the match is played.
      </p>
    </>
  );
}

function teamNote(e: TeamEntry): string {
  switch (e.state) {
    case "held":
      return "Your charge is complete. The keeper transfer is pending until the match rules are met.";
    case "awaiting_release":
      return "The match is over. The keeper is paid once you confirm, or automatically three days after the match.";
    case "released":
      return `Paid to the keeper${e.releasedAt ? ` on ${shortDate(e.releasedAt)}` : ""}. Thanks for playing.`;
    case "review":
      return "The keeper transfer is paused while we review this match.";
    case "dispute":
      return "This payment is being disputed with your bank. We will contact you if we need anything.";
    default: {
      const base = who(e.cancelledBy, "team");
      if (e.refundStatus === "none") return `${base} No refund applies because it was too close to kick-off.`;
      return e.refundStatus === "done"
        ? `${base} The refund has been sent. A refund to a card can take several days to show on your statement.`
        : `${base} Your refund is being processed. A refund to a card can take several days to show on your statement.`;
    }
  }
}

// --- Portero ---

export function KeeperPayments({
  entries,
  teamOf,
  summary,
  hasStripeAccount,
}: {
  entries: KeeperEntry[];
  teamOf: Map<string, string>;
  summary: ReturnType<typeof keeperSummary>;
  hasStripeAccount: boolean;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={WalletIcon}
        title="No payments yet"
        body="Once a team books you, the match and its payment show up here."
        action={
          <Button href="/map" size="md" withArrow>
            Find matches
          </Button>
        }
      />
    );
  }
  const attention = summary.reviewPence + summary.disputePence;
  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Paid"
          value={moneyPence(summary.paidPence)}
          hint={`${moneyPence(summary.paidThisMonthPence)} this month`}
          tone="success"
        />
        <StatCard label="Booked" value={moneyPence(summary.bookedPence)} hint="Upcoming games, already paid by the team" tone="accent" />
        <StatCard label="Waiting" value={moneyPence(summary.pendingPence)} hint="Played, not paid out yet" />
        <StatCard label="Review or dispute" value={moneyPence(attention)} hint="Transfer paused while the case is reviewed" tone={attention > 0 ? "warning" : "default"} />
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-muted">
        &ldquo;Paid&rdquo; means MatchKeeper sent the money to your Stripe account. When it reaches your bank is set by Stripe, and
        you can see it in your Stripe dashboard.
        {summary.debtTakenPence > 0 && ` ${moneyPence(summary.debtTakenPence)} was taken from your payments to repay a disputed payment.`}
      </p>
      {hasStripeAccount && (
        <div className="mb-8">
          <StripeDashboardButton />
        </div>
      )}

      {groupByMonth(entries).map(({ monthKey, items }) => (
        <MonthBlock
          key={monthKey}
          monthKey={monthKey}
          totalLabel="Paid"
          total={moneyPence(items.reduce((s, e) => s + e.netPaidPence, 0))}
          action={
            <a
              href={`/payments/export?month=${monthKey}`}
              className="font-semibold text-accent-strong underline underline-offset-4"
            >
              Download CSV
            </a>
          }
        >
          {items.map((e) => {
            const s = KEEPER_STATE[e.state];
            return (
              <Row
                key={e.bookingId}
                entry={e}
                title={splitAddress(e.address).name}
                subtitle={`For ${teamOf.get(e.bookingId) ?? "a team"}`}
                badge={<StatusBadge tone={s.tone}>{s.label}</StatusBadge>}
                amount={moneyPence(e.paid ? e.netPaidPence : e.grossPence)}
                amountHint={e.paid ? "Sent to Stripe" : undefined}
              >
                <dl className="grid max-w-md gap-1.5">
                  <Line label={e.state.startsWith("cancelled") ? "Your share" : "Your rate"} value={moneyPence(e.grossPence)} />
                  {e.debtPence > 0 && <Line label="Repaid for a disputed payment" value={`-${moneyPence(e.debtPence)}`} />}
                  {e.paid && <Line label="Sent to your Stripe account" value={moneyPence(e.netPaidPence)} strong />}
                </dl>
                <p className="pl-prose text-[14px]">{keeperNote(e)}</p>
              </Row>
            );
          })}
        </MonthBlock>
      ))}
    </>
  );
}

function keeperNote(e: KeeperEntry): string {
  switch (e.state) {
    case "held":
      return "The team has paid. You are paid after the match.";
    case "awaiting_release":
      return e.checkedIn
        ? `You checked in. You are paid when the team confirms${e.autoReleaseAt ? `, or automatically by ${longDate(e.autoReleaseAt)}` : ""}, unless they report a problem.`
        : "You did not check in, so we review the payment before it goes out unless the team confirms the match.";
    case "released":
      return `Sent to your Stripe account${e.releasedAt ? ` on ${shortDate(e.releasedAt)}` : ""}. Stripe pays it to your bank on its normal schedule.`;
    case "review":
      return "The keeper transfer is paused while we review this match. We will contact you both.";
    case "dispute":
      return "The team disputed this payment with their bank. We will contact you if we need anything from you.";
    default: {
      const base = who(e.cancelledBy, "keeper");
      const strike = e.strike ? " A strike was added to your profile." : "";
      if (e.grossPence === 0) return `${base} No payment is due.${strike}`;
      return e.paid
        ? `${base} Your share was sent to your Stripe account${e.releasedAt ? ` on ${shortDate(e.releasedAt)}` : ""}.${strike}`
        : `${base} Your share is being sent to your Stripe account.${strike}`;
    }
  }
}
