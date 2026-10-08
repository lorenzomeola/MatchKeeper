import { Avatar } from "@/components/app/avatar";
import { EmptyState } from "@/components/app/empty-state";
import { NextMatchHero, ProfileNudge, UnreadNotice } from "@/components/app/home-parts";
import { MatchCard } from "@/components/app/match-card";
import { PageHeader, Section, SectionLink } from "@/components/app/page-header";
import { PaymentsLink } from "@/components/app/payments-link";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/platform/button";
import { ListIcon } from "@/components/platform/icons";
import { loadPlayerHome } from "@/lib/data/dashboard";
import { loadUnreadCount } from "@/lib/data/messages";
import { firstName } from "@/lib/format";
import type { completeness, PlayerKind } from "@/lib/profile";

type Props = {
  userId: string;
  profile: { display_name: string; city: string | null };
  teamName: string;
  kind: PlayerKind;
  rating: ReturnType<typeof completeness>;
};

export async function PlayerHome({ userId, profile, teamName, kind, rating }: Props) {
  const [d, unread] = await Promise.all([loadPlayerHome(userId), loadUnreadCount()]);
  const isTeam = kind === "team";
  const rest = d.upcoming.filter((m) => m.id !== d.next?.id).slice(0, 4);
  const needsReply = d.needsAttention.filter(({ match }) => match.id !== d.next?.id);

  const nextStatus = d.next ? (
    d.nextKeeper ? (
      <span className="flex items-center gap-3">
        <Avatar name={d.nextKeeper.name} src={d.nextKeeper.avatarUrl} size="sm" />
        <span>
          <span className="block text-fg">{d.nextKeeper.name}</span>
          <span className="block text-xs font-medium text-accent-strong">Keeper booked</span>
        </span>
      </span>
    ) : d.nextPending > 0 ? (
      <span className="text-fg">
        <strong className="font-semibold">
          {d.nextPending} {d.nextPending === 1 ? "keeper has" : "keepers have"} applied.
        </strong>{" "}
        <span className="text-muted">Compare them and pick one.</span>
      </span>
    ) : (
      <span className="text-muted">No applications yet. Keepers nearby can see this match.</span>
    )
  ) : null;

  return (
    <>
      <PageHeader
        eyebrow={`${profile.city ?? "London"} · ${isTeam ? "Team" : "Player"}`}
        title={isTeam && teamName ? `Hi, ${teamName}` : `Hi, ${firstName(profile.display_name)}`}
        description={
          isTeam && teamName
            ? "Here is where your matches stand."
            : d.next
              ? "Here is where your matches stand."
              : "Post a match and keepers nearby can apply with their rate."
        }
      />

      <div className="grid gap-6">
        <UnreadNotice count={unread} />
        {(rating.requiredMissing.length > 0 || rating.percent < 100) && (
          <ProfileNudge
            percent={rating.percent}
            tier={rating.tier}
            missing={rating.requiredMissing.map((i) => i.label)}
            hint="A level and a few words about the group help keepers decide."
          />
        )}

        {d.next ? (
          <NextMatchHero
            eyebrow="Next match"
            match={d.next}
            href={`/matches/${d.next.id}`}
            status={nextStatus}
            cta={d.nextKeeper ? "Open match" : d.nextPending > 0 ? "Review keepers" : "View match"}
          />
        ) : (
          <EmptyState
            icon={ListIcon}
            title="No matches coming up"
            body="Add the date, the pitch and the level. Keepers nearby can then apply with their rate."
            action={
              <Button href="/matches/new" size="md" withArrow>
                Post a match
              </Button>
            }
          />
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Open matches" value={d.openCount} hint="Waiting for a keeper" href="/matches" tone="success" />
          <StatCard
            label="Keepers to review"
            value={d.waitingCount}
            hint={d.waitingCount > 0 ? "Applied to your matches" : "Nobody waiting"}
            tone={d.waitingCount > 0 ? "warning" : "default"}
            href="/matches"
          />
          <StatCard label="Keepers booked" value={d.bookedCount} hint="Upcoming matches" href="/calendar" tone="accent" />
          <StatCard label="Matches played" value={d.playedCount} hint={`${d.totalPosted} posted in total`} />
        </div>
        <PaymentsLink role="team" />
      </div>

      {needsReply.length > 0 && (
        <Section title="Needs your reply">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {needsReply.slice(0, 4).map(({ match, pending }) => (
              <li key={match.id}>
                <MatchCard
                  match={match}
                  href={`/matches/${match.id}`}
                  footer={
                    <>
                      <span className="font-medium text-warning">
                        {pending} {pending === 1 ? "keeper" : "keepers"} applied
                      </span>
                      <span className="font-semibold text-accent-strong">Review</span>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {rest.length > 0 && (
        <Section title="Coming up" action={<SectionLink href="/matches">All matches</SectionLink>}>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rest.map((m) => (
              <li key={m.id}>
                <MatchCard
                  match={m}
                  href={`/matches/${m.id}`}
                  footer={
                    <span className={m.status === "assigned" ? "font-medium text-accent-strong" : "font-medium text-success"}>
                      {m.status === "assigned" ? "Keeper booked" : "Looking for a keeper"}
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
