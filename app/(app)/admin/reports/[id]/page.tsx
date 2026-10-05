import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApprovalControl, ReportActions } from "@/components/app/admin-controls";
import { Section } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { ArrowLeftIcon } from "@/components/platform/icons";
import { loadReportDetail, profileRating } from "@/lib/data/admin";
import { clockTime, dayLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Report", robots: { index: false } };

export default async function AdminReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadReportDetail(id);
  if (!data) notFound();
  const { report: r, names, messages, match, reported } = data;
  const reporter = names.get(r.reporter_id)?.name ?? "Someone";
  const reportedName = names.get(r.reported_id)?.name ?? "a user";

  return (
    <>
      <Link href="/admin/reports" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted transition-colors duration-200 hover:text-fg">
        <ArrowLeftIcon className="h-4 w-4" />
        Reports
      </Link>

      <section className="pl-surface rounded-[var(--r-xl)] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <h1 className="pl-display text-fg [font-size:var(--t-2xl)]">{r.reason}</h1>
          <StatusBadge tone={r.status === "open" ? "danger" : "neutral"}>{r.status}</StatusBadge>
        </div>
        <p className="mt-2 text-sm text-muted">
          <Link href={`/admin/users/${r.reporter_id}`} className="font-medium text-fg-2 hover:underline">
            {reporter}
          </Link>{" "}
          reported{" "}
          <Link href={`/admin/users/${r.reported_id}`} className="font-medium text-fg-2 hover:underline">
            {reportedName}
          </Link>
          {match ? (
            <>
              {" "}
              about the match at{" "}
              <Link href={`/matches/${match.id}`} className="font-medium text-fg-2 hover:underline">
                {match.address ?? "an unknown pitch"}
              </Link>
            </>
          ) : null}
          .
        </p>
        {r.details && <p className="mt-4 rounded-[var(--r-md)] bg-surface px-4 py-3 text-sm leading-relaxed text-fg-2">{r.details}</p>}

        <div className="mt-5">
          <ReportActions reportId={r.id} status={r.status} />
        </div>

        {reported?.role === "goalkeeper" && (
          <div className="mt-5 border-t border-line pt-5 sm:max-w-xs">
            <p className="mb-2 text-xs font-medium text-muted">{reported.approved ? "This keeper can apply to matches." : "This keeper is not approved."}</p>
            <ApprovalControl
              profileId={reported.id}
              name={reported.display_name}
              approved={reported.approved}
              missing={profileRating(reported).requiredMissing.map((i) => i.label)}
            />
          </div>
        )}
      </section>

      <Section title="The conversation" className="mt-10">
        {messages.length === 0 ? (
          <p className="pl-prose text-[15px]">There are no messages in this conversation.</p>
        ) : (
          <ol className="pl-surface grid gap-3 rounded-[var(--r-lg)] p-4 sm:p-5">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
              const reportedSender = m.sender_id === r.reported_id;
              return (
                <li key={m.id}>
                  {newDay && <p className="mb-2 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{dayLabel(m.created_at)}</p>}
                  <p className="text-xs font-medium text-muted">
                    <span className={reportedSender ? "text-danger" : "text-fg-2"}>{names.get(m.sender_id)?.name ?? "User"}</span> · {clockTime(m.created_at)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words rounded-[var(--r-md)] bg-surface px-3.5 py-2.5 text-[15px] leading-snug text-fg">{m.body}</p>
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    </>
  );
}
