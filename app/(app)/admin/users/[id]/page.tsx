import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/app/avatar";
import { ApprovalControl } from "@/components/app/admin-controls";
import { joined } from "@/components/app/admin-parts";
import { Section } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { ArrowLeftIcon } from "@/components/platform/icons";
import { loadUserDetail, profileRating } from "@/lib/data/admin";
import { dateTile } from "@/lib/format";

export const metadata: Metadata = { title: "User", robots: { index: false } };

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadUserDetail(id);
  if (!data) notFound();
  const { profile: p, teamName, counts, reports } = data;
  const isKeeper = p.role === "goalkeeper";
  const rating = profileRating(p);
  const role = p.is_admin ? "Admin" : isKeeper ? "Goalkeeper" : p.player_kind === "team" ? "Team" : "Player";

  return (
    <>
      <Link href="/admin/users" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted transition-colors duration-200 hover:text-fg">
        <ArrowLeftIcon className="h-4 w-4" />
        Users
      </Link>

      <section className="pl-surface rounded-[var(--r-xl)] p-5 sm:p-7">
        <div className="flex items-start gap-4 sm:gap-5">
          <Avatar name={p.display_name} src={p.avatar_url} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="pl-display truncate text-fg [font-size:var(--t-3xl)]">{p.display_name}</h1>
            <p className="mt-1.5 text-sm text-muted">
              {role}
              {teamName ? ` · ${teamName}` : ""} · {p.city ?? "No city"} · joined {joined(p.created_at)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {isKeeper && <StatusBadge tone={p.approved ? "success" : "warning"}>{p.approved ? "Approved" : "In review"}</StatusBadge>}
              <StatusBadge tone="neutral">
                Profile {rating.tier} · {rating.percent}%
              </StatusBadge>
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          {isKeeper && (
            <div>
              <dt className="text-xs font-medium text-muted">Experience</dt>
              <dd className="mt-1 text-[15px] text-fg">{p.experience_years != null ? `${p.experience_years} years` : "Not given"}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-muted">Level</dt>
            <dd className="mt-1 text-[15px] text-fg">{p.level ?? "Not given"}</dd>
          </div>
        </dl>

        <div className="mt-5 rounded-[var(--r-md)] bg-surface px-4 py-3">
          <p className="text-xs font-medium text-muted">{isKeeper ? "Bio" : "About"}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg-2">{p.bio?.trim() || "Nothing written yet."}</p>
        </div>

        {isKeeper && (
          <div className="mt-5 sm:max-w-xs">
            <ApprovalControl profileId={p.id} name={p.display_name} approved={p.approved} missing={rating.requiredMissing.map((i) => i.label)} />
          </div>
        )}
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Matches posted" value={counts.matches} />
        <StatCard label="Applications" value={counts.applications} />
        <StatCard label="Bookings" value={counts.bookings} />
        <StatCard
          label="Reports against"
          value={counts.reportsAgainst}
          tone={counts.reportsAgainst > 0 ? "warning" : "default"}
          hint={`${counts.reportsBy} filed by them`}
        />
      </div>

      {reports.length > 0 && (
        <Section title="Reports against this user" className="mt-10">
          <ul className="pl-surface divide-y divide-line overflow-hidden rounded-[var(--r-lg)]">
            {reports.map((r) => {
              const t = dateTile(r.created_at);
              return (
                <li key={r.id}>
                  <Link href={`/admin/reports/${r.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 hover:bg-surface">
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium text-fg">{r.reason}</span>
                      <span className="block text-[13px] text-muted">
                        {t.day} {t.month}
                      </span>
                    </span>
                    <StatusBadge tone={r.status === "open" ? "danger" : "neutral"}>{r.status}</StatusBadge>
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
