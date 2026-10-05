import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/app/avatar";
import { ApplicantList, ApplicantStatus, type Applicant } from "@/components/app/applicant-list";
import { ApplyCard, WithdrawButton } from "@/components/app/apply-card";
import { EmptyState } from "@/components/app/empty-state";
import { DateTile, MatchChips } from "@/components/app/match-card";
import { Section } from "@/components/app/page-header";
import { PostedToast } from "@/components/app/posted-toast";
import { ReviewCard } from "@/components/app/review-card";
import { MATCH_STATUS, StatusBadge } from "@/components/app/status-badge";
import { ArrowLeftIcon, ChatIcon, PinIcon, StarIcon, UsersIcon } from "@/components/platform/icons";
import { daysAway, isPast, longDate, money, splitAddress, timeRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Match", robots: { index: false } };

type KeeperEmbed = {
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  level: string | null;
  experience_years: number | null;
};

type ApplicationRow = {
  id: string;
  rate: string | number;
  message: string | null;
  status: string;
  created_at: string;
  goalkeeper_id: string;
  profiles: KeeperEmbed | null;
};

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
  if (!match) notFound();

  const { data: me } = await supabase.from("profiles").select("role, approved").eq("id", user.id).maybeSingle();
  const isOwner = match.created_by === user.id;
  const isKeeper = me?.role === "goalkeeper";

  let applications: ApplicationRow[] = [];
  if (isOwner) {
    const { data } = await supabase
      .from("applications")
      .select(
        "id, rate, message, status, created_at, goalkeeper_id, profiles:goalkeeper_id(display_name, avatar_url, city, bio, level, experience_years)",
      )
      .eq("match_id", id)
      .order("created_at", { ascending: true });
    applications = (data as unknown as ApplicationRow[]) ?? [];
  }

  let mine: { id: string; status: string; rate: string | number; message: string | null } | null = null;
  if (!isOwner && isKeeper) {
    const { data } = await supabase
      .from("applications")
      .select("id, status, rate, message")
      .eq("match_id", id)
      .eq("goalkeeper_id", user.id)
      .maybeSingle();
    mine = data;
  }

  // Quien publica: se muestra al portero con el nombre del equipo si existe.
  let posterName = "";
  if (!isOwner) {
    const [{ data: poster }, { data: team }] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", match.created_by).maybeSingle(),
      supabase.from("teams").select("name").eq("owner_id", match.created_by).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    ]);
    posterName = team?.name ?? poster?.display_name ?? "A player";
  }

  const expired = match.status === "open" && isPast(match.ends_at);
  const status = expired ? { label: "Expired", tone: "neutral" as const } : (MATCH_STATUS[match.status] ?? MATCH_STATUS.open);

  const pending = applications.filter((a) => a.status === "pending");
  const booked = applications.find((a) => a.status === "accepted");
  const applicants: Applicant[] = pending.map((a) => ({
    id: a.id,
    keeperId: a.goalkeeper_id,
    rate: Number(a.rate),
    message: a.message,
    createdAt: a.created_at,
    name: a.profiles?.display_name ?? "Goalkeeper",
    avatarUrl: a.profiles?.avatar_url ?? null,
    city: a.profiles?.city ?? null,
    bio: a.profiles?.bio ?? null,
    level: a.profiles?.level ?? null,
    experienceYears: a.profiles?.experience_years ?? null,
  }));

  const canApply = !isOwner && isKeeper && me?.approved && match.status === "open" && !expired && !mine;

  // Reseña: solo el jugador que reservó, cuando el partido ya terminó.
  let reviewBooking: { id: string; rating: number | null; comment: string | null } | null = null;
  if (isOwner && booked && isPast(match.ends_at)) {
    const { data: bk } = await supabase.from("bookings").select("id").eq("match_id", id).maybeSingle();
    if (bk) {
      const { data: rv } = await supabase.from("reviews").select("rating, comment").eq("booking_id", bk.id).maybeSingle();
      reviewBooking = { id: bk.id, rating: rv?.rating ?? null, comment: rv?.comment ?? null };
    }
  }

  return (
    <>
      <Suspense>
        <PostedToast />
      </Suspense>

      <Link
        href="/matches"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted transition-colors duration-200 hover:text-fg"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {isKeeper ? "My games" : "My matches"}
      </Link>

      <section className="pl-surface relative overflow-hidden rounded-[var(--r-xl)] p-5 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent opacity-[0.12] blur-3xl"
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge tone={status.tone} dot={match.status === "open" && !expired}>
              {status.label}
            </StatusBadge>
            {match.status !== "cancelled" && !isPast(match.ends_at) && (
              <span className="text-xs font-semibold text-accent-strong">{daysAway(match.starts_at)}</span>
            )}
          </div>

          <div className="mt-5 flex items-start gap-4 sm:gap-5">
            <DateTile iso={match.starts_at} large />
            <div className="min-w-0 flex-1">
              <h1 className="pl-display text-fg [font-size:var(--t-3xl)]">{splitAddress(match.address).name}</h1>
              {splitAddress(match.address).rest && (
                <p className="mt-1 text-sm text-muted">{splitAddress(match.address).rest}</p>
              )}
              <p className="mt-2 text-sm text-fg-2">
                {longDate(match.starts_at)} · {timeRange(match.starts_at, match.ends_at)}
              </p>
              {!isOwner && <p className="mt-1 text-sm text-muted">Posted by {posterName}</p>}
              <MatchChips match={match} />
            </div>
          </div>

          {match.notes && (
            <p className="mt-5 rounded-[var(--r-md)] bg-surface px-4 py-3 text-sm leading-relaxed text-fg-2">
              <span className="mb-0.5 block text-xs font-medium text-muted">Notes</span>
              {match.notes}
            </p>
          )}

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${match.lat},${match.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-strong"
          >
            <PinIcon className="h-4 w-4" />
            Open the pitch in Maps
          </a>
        </div>
      </section>

      {isOwner ? (
        <>
          {booked ? (
            <Section title="Your keeper" className="mt-8">
              <div className="pl-surface flex items-center gap-4 rounded-[var(--r-lg)] p-4 sm:p-5">
                <Link href={`/keepers/${booked.goalkeeper_id}`} aria-label="Keeper profile" className="shrink-0">
                  <Avatar name={booked.profiles?.display_name ?? "Goalkeeper"} src={booked.profiles?.avatar_url} size="lg" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/keepers/${booked.goalkeeper_id}`} className="-my-2.5 block truncate py-2.5 text-base font-semibold text-fg hover:text-accent-strong">
                    {booked.profiles?.display_name ?? "Goalkeeper"}
                  </Link>
                  <p className="text-sm text-muted">{money(booked.rate)} for this match</p>
                  <div className="mt-1.5">
                    <ApplicantStatus status="accepted" />
                  </div>
                </div>
                <Link
                  href={`/messages/${booked.id}`}
                  className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-[var(--r-md)] border border-line-strong px-4 text-[15px] font-medium text-fg transition-colors duration-200 hover:border-accent"
                >
                  <ChatIcon className="h-[18px] w-[18px]" />
                  Message
                </Link>
              </div>
            </Section>
          ) : (
            <Section title={`Keepers who applied${applicants.length ? ` (${applicants.length})` : ""}`} className="mt-8">
              {applicants.length === 0 ? (
                <EmptyState
                  icon={UsersIcon}
                  title="No applications yet"
                  body={
                    expired
                      ? "This match has already been played."
                      : "Keepers nearby can see your match. Applications show up here with their rate, so you can compare."
                  }
                />
              ) : (
                <ApplicantList matchId={match.id} applicants={applicants} />
              )}
            </Section>
          )}

          {reviewBooking && (
            <Section title="Your review" className="mt-8">
              {reviewBooking.rating != null ? (
                <div className="pl-surface rounded-[var(--r-lg)] p-4 sm:p-5">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-fg">
                    <StarIcon className="h-4 w-4 fill-current text-accent" />
                    {reviewBooking.rating}/5
                  </span>
                  {reviewBooking.comment && <p className="mt-2 text-sm leading-relaxed text-fg-2">{reviewBooking.comment}</p>}
                </div>
              ) : (
                <ReviewCard bookingId={reviewBooking.id} matchId={match.id} keeperName={booked?.profiles?.display_name ?? "your keeper"} />
              )}
            </Section>
          )}
        </>
      ) : isKeeper ? (
        <div className="mt-8 grid gap-4">
          {!me?.approved && !mine && (
            <section className="rounded-[var(--r-lg)] border border-warning/40 bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] p-5">
              <StatusBadge tone="warning">In review</StatusBadge>
              <p className="mt-3 text-[15px] font-semibold text-fg">You can apply once your profile is approved</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                A person checks every keeper profile. A complete profile is reviewed first.
              </p>
              <Link href="/profile" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent-strong underline underline-offset-4">
                Review your profile
              </Link>
            </section>
          )}

          {canApply && <ApplyCard matchId={match.id} budget={match.budget_suggested} />}

          {mine && (
            <section className="pl-surface rounded-[var(--r-xl)] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="pl-display text-fg [font-size:var(--t-xl)]">
                    {mine.status === "accepted" ? "You are booked" : "Your application"}
                  </p>
                  <p className="mt-1 text-sm text-muted">Your rate: {money(mine.rate)}</p>
                </div>
                <ApplicantStatus status={mine.status} />
              </div>
              {mine.message && <p className="mt-3 rounded-[var(--r-md)] bg-surface px-3 py-2.5 text-sm text-fg-2">{mine.message}</p>}
              {mine.status === "rejected" && (
                <p className="pl-prose mt-3 text-[15px]">The team picked another keeper for this match.</p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                {(mine.status === "pending" || mine.status === "accepted") && (
                  <Link
                    href={`/messages/${mine.id}`}
                    className="inline-flex min-h-12 items-center gap-2 rounded-[var(--r-md)] border border-line-strong px-4 text-[15px] font-medium text-fg transition-colors duration-200 hover:border-accent"
                  >
                    <ChatIcon className="h-[18px] w-[18px]" />
                    Messages
                  </Link>
                )}
                {mine.status === "pending" && <WithdrawButton applicationId={mine.id} matchId={match.id} />}
              </div>
            </section>
          )}

          {!canApply && !mine && me?.approved && (
            <p className="pl-prose text-[15px]">{expired ? "This match has already been played." : "This match is no longer open for applications."}</p>
          )}
        </div>
      ) : null}
    </>
  );
}
