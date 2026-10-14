import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { NextMatchHero, ProfileNudge, UnreadNotice } from "@/components/app/home-parts";
import { MatchCard } from "@/components/app/match-card";
import { PageHeader, Section, SectionLink } from "@/components/app/page-header";
import { PaymentsLink } from "@/components/app/payments-link";
import { StatCard } from "@/components/app/stat-card";
import { APPLICATION_STATUS, StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/platform/button";
import { MapIcon } from "@/components/platform/icons";
import { PaymentSetupCard } from "@/components/app/payment-setup-card";
import { StandingCard } from "@/components/app/standing-card";
import { DebtCard } from "@/components/app/debt-card";
import { PayoutProblemCard } from "@/components/app/payout-problem-card";
import { loadKeeperHome } from "@/lib/data/dashboard";
import { loadMyDebtPence } from "@/lib/data/debts";
import { loadUnreadCount } from "@/lib/data/messages";
import { loadPayoutProblem } from "@/lib/data/payments";
import { loadMyStanding } from "@/lib/data/standing";
import { dateTile, firstName, money, timeRange } from "@/lib/format";
import { getPaymentMode } from "@/lib/payments/mode";
import type { completeness } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

type Props = {
  userId: string;
  profile: { display_name: string; city: string | null; approved: boolean };
  rating: ReturnType<typeof completeness>;
};

export async function KeeperHome({ userId, profile, rating }: Props) {
  const supabase = await createClient();
  const payments = (await getPaymentMode()) === "paid";
  const [d, unread, { data: payAccount }, standing, debtPence, payoutProblem] = await Promise.all([
    loadKeeperHome(userId),
    loadUnreadCount(),
    supabase.from("keeper_stripe_accounts").select("payouts_enabled").eq("profile_id", userId).maybeSingle(),
    loadMyStanding(supabase, userId),
    loadMyDebtPence(supabase, userId),
    loadPayoutProblem(supabase, userId),
  ]);
  const next = d.next?.matches ?? null;

  return (
    <>
      <PageHeader
        eyebrow={`${profile.city ?? "London"} · Goalkeeper`}
        title={`Hi, ${firstName(profile.display_name)}`}
        description={
          profile.approved
            ? "Open matches are waiting for a keeper. Apply with your own rate."
            : "You can browse open matches while your profile is being reviewed."
        }
      />

      <div className="grid gap-6">
        <UnreadNotice count={unread} />
        <StandingCard level={standing.level} />
        <DebtCard pence={debtPence} />
        {payments && payoutProblem && <PayoutProblemCard message={payoutProblem.message} />}
        {!profile.approved && (
          <section className="rounded-[var(--r-lg)] border border-warning/40 bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] p-5">
            <div className="flex items-center gap-2">
              <StatusBadge tone="warning">In review</StatusBadge>
            </div>
            <p className="mt-3 text-[15px] font-semibold text-fg">A person is checking your profile</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              You can apply to matches once it is approved. Check back here, your status updates as soon as the review is done.
            </p>
          </section>
        )}

        {payments && profile.approved && !payAccount?.payouts_enabled && <PaymentSetupCard resume={Boolean(payAccount)} />}

        {(rating.requiredMissing.length > 0 || rating.percent < 100) && (
          <ProfileNudge
            percent={rating.percent}
            tier={rating.tier}
            missing={rating.requiredMissing.map((i) => i.label)}
            hint="Photo, bio and experience are what teams read first."
          />
        )}

        {next && d.next ? (
          <NextMatchHero
            eyebrow="Your next game"
            match={next}
            href={`/matches/${next.id}`}
            status={
              <span>
                <span className="block text-fg">Booked for {d.posterLabel(next.created_by)}</span>
                <span className="block text-xs text-muted">Your rate: {money(d.next.rate) ?? "to be confirmed"}</span>
              </span>
            }
            cta="Open match"
          />
        ) : (
          <EmptyState
            icon={MapIcon}
            title="No games booked yet"
            body="Browse the open matches near you and apply with your rate. A team picks a keeper from the ones who apply."
            action={
              <Button href="/map" size="md" withArrow>
                Find matches
              </Button>
            }
          />
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Open matches" value={d.availableCount} hint="You have not applied to" href="/map" tone="success" />
          <StatCard label="Waiting for a reply" value={d.waitingCount} hint="Applications sent" href="/matches" />
          <StatCard label="Games booked" value={d.bookedCount} hint="Upcoming" href="/calendar" tone="accent" />
          <StatCard label="Applications" value={d.totalApplied} hint="Sent so far" />
        </div>
        {payments && profile.approved && <PaymentsLink role="keeper" />}
      </div>

      <Section
        title="Open matches"
        action={<SectionLink href="/map">See on the map</SectionLink>}
      >
        {d.available.length === 0 ? (
          <p className="pl-prose text-[15px]">
            Nothing open right now. New matches show up here as soon as a team posts them.
          </p>
        ) : (
          <ul className="pl-cards grid grid-cols-1 gap-3 sm:grid-cols-2">
            {d.available.map((m) => (
              <li key={m.id}>
                <MatchCard
                  match={m}
                  href={`/matches/${m.id}`}
                  by={d.posterLabel(m.created_by)}
                  footer={
                    <>
                      <span className="text-muted">
                        {profile.approved ? "Open for applications" : "Applications open once approved"}
                      </span>
                      <span className="font-semibold text-accent-strong">View</span>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {d.recent.length > 0 && (
        <Section
          title="Your applications"
          action={<SectionLink href="/matches">All applications</SectionLink>}
        >
          <ul className="pl-surface divide-y divide-line overflow-hidden rounded-[var(--r-lg)]">
            {d.recent.map((a) => {
              const m = a.matches!;
              const s = APPLICATION_STATUS[a.status] ?? { label: a.status, tone: "neutral" as const };
              const t = dateTile(m.starts_at);
              return (
                <li key={a.id}>
                  <Link
                    href={`/matches/${m.id}`}
                    className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-surface"
                  >
                    <span className="w-12 shrink-0 text-center leading-none">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t.weekday}</span>
                      <span className="pl-display pl-tnum mt-1 block text-lg text-fg">{t.day}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-fg">{m.address || "Pitch to be confirmed"}</span>
                      <span className="block text-[13px] text-muted">
                        {timeRange(m.starts_at, m.ends_at)} · {money(a.rate)}
                      </span>
                    </span>
                    <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </>
  );
}
