import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/app/avatar";
import { BookingForm } from "@/components/app/booking-form";
import { PageHeader } from "@/components/app/page-header";
import { ArrowLeftIcon } from "@/components/platform/icons";
import { longDate, moneyPence, splitAddress, timeRange } from "@/lib/format";
import { COMMISSION_PCT } from "@/lib/payments/config";
import { calculateTotals } from "@/lib/payments/money";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Book a keeper", robots: { index: false } };

const POLICY = [
  ["More than 24 hours before kick-off", "Free. You get everything back."],
  ["Between 24 and 2 hours before", "You pay 50%. The other 50% is refunded."],
  ["Less than 2 hours, or no show", "You pay 100%."],
  ["If the keeper cancels or does not show", "You always get a full refund."],
] as const;

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ application?: string }>;
}) {
  const { id } = await params;
  const { application: applicationId } = await searchParams;
  if (!applicationId) redirect(`/matches/${id}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
  if (!match) notFound();
  if (match.created_by !== user.id || match.status !== "open") redirect(`/matches/${id}`);

  const { data: app } = await supabase
    .from("applications")
    .select("id, rate, status, goalkeeper_id, match_id")
    .eq("id", applicationId)
    .eq("match_id", id)
    .maybeSingle();
  if (!app || app.status !== "pending") redirect(`/matches/${id}`);

  const { data: keeper } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, city")
    .eq("id", app.goalkeeper_id)
    .maybeSingle();

  const totals = calculateTotals(Math.round(Number(app.rate) * 100), COMMISSION_PCT);
  const pitch = splitAddress(match.address);

  return (
    <>
      <Link
        href={`/matches/${id}`}
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted transition-colors duration-200 hover:text-fg"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to the match
      </Link>

      <PageHeader eyebrow="Book a keeper" title="Review and pay" description="Your payment is held until the match is played." />

      <div className="grid gap-5">
        <section className="pl-surface flex items-center gap-4 rounded-[var(--r-lg)] p-4 sm:p-5">
          <Avatar name={keeper?.display_name ?? "Goalkeeper"} src={keeper?.avatar_url} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-fg">{keeper?.display_name ?? "Goalkeeper"}</p>
            <p className="text-sm text-muted">
              {pitch.name} · {longDate(match.starts_at)}, {timeRange(match.starts_at, match.ends_at)}
            </p>
          </div>
        </section>

        <section className="pl-surface rounded-[var(--r-lg)] p-4 sm:p-5">
          <dl className="grid gap-2.5 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-fg-2">Keeper rate</dt>
              <dd className="pl-tnum text-fg">{moneyPence(totals.ratePence)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-2">MatchKeeper service fee ({COMMISSION_PCT}%)</dt>
              <dd className="pl-tnum text-fg">{moneyPence(totals.platformFeePence)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3 font-semibold">
              <dt className="text-fg">Total</dt>
              <dd className="pl-tnum text-fg">{moneyPence(totals.totalPence)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            The keeper receives the full rate. Booking closes the other applications once the payment goes through.
          </p>
        </section>

        <section className="pl-surface rounded-[var(--r-lg)] p-4 sm:p-5">
          <p className="text-sm font-semibold text-fg">Cancellation policy</p>
          <ul className="mt-3 grid gap-2.5 text-sm">
            {POLICY.map(([when, what]) => (
              <li key={when} className="grid gap-0.5 sm:grid-cols-2 sm:gap-4">
                <span className="text-fg-2">{when}</span>
                <span className="text-fg">{what}</span>
              </li>
            ))}
          </ul>
        </section>

        <BookingForm applicationId={app.id} total={moneyPence(totals.totalPence)} />
      </div>
    </>
  );
}
