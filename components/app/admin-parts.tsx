import Link from "next/link";
import { Avatar } from "@/components/app/avatar";
import { ApprovalControl, InfoRequestControl } from "@/components/app/admin-controls";
import { StatusBadge } from "@/components/app/status-badge";
import { ArrowRightIcon } from "@/components/platform/icons";
import { profileRating, type AdminProfile, type InfoRequest } from "@/lib/data/admin";
import { dateTile } from "@/lib/format";

export const joined = (iso: string) => {
  const t = dateTile(iso);
  return `${t.day} ${t.month}`;
};

/** Ficha completa de un portero para revisar y aprobar. */
export function KeeperReviewCard({ p, requests = [] }: { p: AdminProfile; requests?: InfoRequest[] }) {
  const rating = profileRating(p);
  const missing = rating.requiredMissing.map((i) => i.label);

  return (
    <article className="pl-surface flex flex-col rounded-[var(--r-xl)] p-4 sm:p-6">
      <div className="flex items-start gap-4">
        <Avatar name={p.display_name} src={p.avatar_url} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/users/${p.id}`} className="-my-2 truncate py-2 text-lg font-semibold text-fg hover:underline">
              {p.display_name}
            </Link>
            <StatusBadge tone={p.approved ? "success" : "warning"}>{p.approved ? "Approved" : "In review"}</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {p.city ?? "No city"} · joined {joined(p.created_at)}
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            <li className="rounded-[var(--r-xs)] bg-surface-2 px-2 py-1 text-xs font-medium text-fg-2">
              {p.experience_years != null ? `${p.experience_years} ${p.experience_years === 1 ? "year" : "years"} as a keeper` : "Experience not given"}
            </li>
            <li className="rounded-[var(--r-xs)] bg-surface-2 px-2 py-1 text-xs font-medium text-fg-2">{p.level ?? "Level not given"}</li>
            <li className="rounded-[var(--r-xs)] bg-surface-2 px-2 py-1 text-xs font-medium text-fg-2">
              Profile {rating.tier} · {rating.percent}%
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-5 flex-1 rounded-[var(--r-md)] bg-surface px-4 py-3">
        <p className="text-xs font-medium text-muted">Bio</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg-2">{p.bio?.trim() || "No bio yet."}</p>
      </div>

      {requests.length > 0 && (
        <div className="mt-3 rounded-[var(--r-md)] bg-surface px-4 py-3">
          <p className="text-xs font-medium text-muted">
            You asked · {joined(requests[0].askedAt)}
            {requests.length > 1 ? ` (${requests.length - 1} earlier)` : ""}
          </p>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-fg-2">{requests[0].question}</p>
        </div>
      )}

      {missing.length > 0 && !p.approved && (
        <p className="mt-3 text-[13px] text-warning">Missing required: {missing.join(", ").toLowerCase()}.</p>
      )}

      <div className="mt-auto pt-5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link
            href={`/admin/users/${p.id}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--r-md)] border border-line-strong px-5 text-[15px] font-medium text-fg transition-colors duration-200 hover:border-accent"
          >
            Open profile
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <ApprovalControl profileId={p.id} name={p.display_name} approved={p.approved} missing={missing} />
          {!p.approved && (
            <div className="sm:col-span-2">
              <InfoRequestControl profileId={p.id} name={p.display_name} asked={requests.length > 0} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/** Búsqueda por nombre sin JavaScript: un GET a la misma página. */
export function SearchForm({ base, tab, q, placeholder }: { base: string; tab?: string; q: string; placeholder: string }) {
  return (
    <form action={base} method="get" role="search" className="mb-5 flex gap-2.5">
      {tab && <input type="hidden" name="tab" value={tab} />}
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-input min-w-0 flex-1"
        autoComplete="off"
      />
      <button
        type="submit"
        className="inline-flex min-h-12 shrink-0 items-center rounded-[var(--r-md)] border border-line-strong px-5 text-[15px] font-medium text-fg transition-colors duration-200 hover:border-accent"
      >
        Search
      </button>
    </form>
  );
}

export function UserRow({ p }: { p: AdminProfile }) {
  const role = p.is_admin ? "Admin" : p.role === "goalkeeper" ? "Goalkeeper" : p.player_kind === "team" ? "Team" : "Player";
  return (
    <Link
      href={`/admin/users/${p.id}`}
      className="flex min-h-[4.5rem] items-center gap-3.5 px-4 py-3 transition-colors duration-200 hover:bg-surface"
    >
      <Avatar name={p.display_name} src={p.avatar_url} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-fg">{p.display_name}</span>
        <span className="block truncate text-[13px] text-muted">
          {role} · {p.city ?? "No city"} · joined {joined(p.created_at)}
        </span>
      </span>
      {p.role === "goalkeeper" && <StatusBadge tone={p.approved ? "success" : "warning"}>{p.approved ? "Approved" : "In review"}</StatusBadge>}
    </Link>
  );
}
