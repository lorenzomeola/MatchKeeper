import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/app/avatar";
import { BackButton } from "@/components/app/back-button";
import { EmptyState } from "@/components/app/empty-state";
import { Section } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { ChatIcon, ShieldCheckIcon, StarIcon } from "@/components/platform/icons";
import { loadKeeperProfile } from "@/lib/data/keeper-profile";
import { monthYear, money, shortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Goalkeeper", robots: { index: false } };

export default async function KeeperProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const k = await loadKeeperProfile(id, user.id);
  if (!k) notFound();

  const facts = [
    k.experienceYears != null ? `${k.experienceYears} ${k.experienceYears === 1 ? "year" : "years"} as a keeper` : null,
    k.level,
    k.ageRange ? `Age ${k.ageRange}` : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <BackButton fallback="/matches" />

      <section className="pl-surface relative overflow-hidden rounded-[var(--r-xl)] p-5 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent opacity-[0.12] blur-3xl"
        />
        <div className="relative flex items-start gap-4 sm:gap-5">
          <Avatar name={k.name} src={k.avatarUrl} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="pl-display text-fg [font-size:var(--t-3xl)]">{k.name}</h1>
            <p className="mt-1.5 text-sm text-muted">
              {k.city ?? "London"} · Joined {monthYear(k.joinedAt)}
            </p>
            {k.approved && (
              <div className="mt-3">
                <StatusBadge tone="success">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheckIcon className="h-3.5 w-3.5" />
                    Verified by MatchKeeper
                  </span>
                </StatusBadge>
              </div>
            )}
          </div>
        </div>

        {facts.length > 0 && (
          <ul className="relative mt-5 flex flex-wrap gap-1.5">
            {facts.map((f) => (
              <li key={f} className="rounded-[var(--r-xs)] bg-surface-2 px-2 py-1 text-xs font-medium text-fg-2">
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="relative mt-5 rounded-[var(--r-md)] bg-surface px-4 py-3">
          <p className="text-xs font-medium text-muted">About</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg-2">
            {k.bio?.trim() || "This keeper has not written a bio yet."}
          </p>
        </div>

        {k.sharedApplicationId && !k.isSelf && (
          <Link
            href={`/messages/${k.sharedApplicationId}`}
            className="relative mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--r-md)] border border-line-strong text-[15px] font-medium text-fg transition-colors duration-200 hover:border-accent active:scale-[0.98] sm:w-auto sm:px-6"
          >
            <ChatIcon className="h-[18px] w-[18px]" />
            Message
          </Link>
        )}
      </section>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard label="Games played" value={k.gamesPlayed} />
        <StatCard label="Average rate" value={k.avgRate != null ? money(k.avgRate) : "-"} />
        <StatCard
          label="Rating"
          value={
            k.avgRating != null ? (
              <span className="inline-flex items-center gap-1.5">
                {k.avgRating.toFixed(1)}
                <StarIcon className="h-5 w-5 fill-current text-accent" />
              </span>
            ) : (
              "-"
            )
          }
          hint={k.reviewCount ? `${k.reviewCount} ${k.reviewCount === 1 ? "review" : "reviews"}` : undefined}
        />
      </div>

      <Section title="Reviews" className="mt-8">
        {k.reviews.length === 0 ? (
          <EmptyState
            icon={StarIcon}
            title="No reviews yet"
            body="Teams and players can review a keeper after a booked match is played."
          />
        ) : (
          <ul className="grid gap-3">
            {k.reviews.map((r) => (
              <li key={r.id} className="pl-surface rounded-[var(--r-lg)] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-fg">
                    <StarIcon className="h-4 w-4 fill-current text-accent" />
                    {r.rating}/5
                  </span>
                  <span className="text-xs text-muted">{shortDate(r.createdAt)}</span>
                </div>
                {r.comment && <p className="mt-2 text-sm leading-relaxed text-fg-2">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
