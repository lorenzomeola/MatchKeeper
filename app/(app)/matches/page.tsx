import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/app/avatar";
import { EmptyState } from "@/components/app/empty-state";
import { MatchCard } from "@/components/app/match-card";
import { PageHeader } from "@/components/app/page-header";
import { APPLICATION_STATUS, MATCH_STATUS, StatusBadge } from "@/components/app/status-badge";
import { Tabs } from "@/components/app/tabs";
import { Button } from "@/components/platform/button";
import { ListIcon, MapIcon } from "@/components/platform/icons";
import { loadKeeperGames, loadPlayerMatches, TABS, type MatchTab } from "@/lib/data/matches";
import { money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Matches", robots: { index: false } };

const LABELS: Record<MatchTab, string> = { open: "Open", booked: "Booked", past: "Past" };
const KEEPER_LABELS: Record<MatchTab, string> = { open: "Waiting", booked: "Booked", past: "Past" };

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role, player_kind").eq("id", user.id).maybeSingle();
  const isKeeper = me?.role === "goalkeeper";
  const posterLabel = me?.player_kind === "team" ? "Team" : "Player";

  const { tab: rawTab } = await searchParams;
  const tab: MatchTab = TABS.includes(rawTab as MatchTab) ? (rawTab as MatchTab) : "open";

  if (isKeeper) {
    const data = await loadKeeperGames(user.id);
    const items = data[tab];
    return (
      <>
        <PageHeader eyebrow="Goalkeeper" title="My games" description="Matches you applied to and the ones you are booked for." />
        <Tabs
          base="/matches"
          active={tab}
          tabs={TABS.map((t) => ({ value: t, label: KEEPER_LABELS[t], count: data[t].length }))}
        />
        {items.length === 0 ? (
          <EmptyState
            icon={MapIcon}
            title={tab === "open" ? "No applications waiting" : tab === "booked" ? "No games booked" : "Nothing here yet"}
            body={
              tab === "past"
                ? "Games you have played and applications that did not go ahead show up here."
                : "Find open matches near you and apply with your own rate."
            }
            action={
              tab === "past" ? undefined : (
                <Button href="/map" size="md" withArrow>
                  Find matches
                </Button>
              )
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map(({ application: a, match, poster }) => {
              const s = APPLICATION_STATUS[a.status] ?? { label: a.status, tone: "neutral" as const };
              return (
                <li key={a.id}>
                  <MatchCard
                    match={match}
                    href={`/matches/${match.id}`}
                    by={poster}
                    footer={
                      <>
                        <span className="font-medium text-fg-2">Your rate {money(a.rate)}</span>
                        <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                      </>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </>
    );
  }

  const data = await loadPlayerMatches(user.id);
  const items = data[tab];

  return (
    <>
      <PageHeader eyebrow={posterLabel} title="My matches" description="Everything you posted, from the first application to the final whistle." />
      <Tabs
        base="/matches"
        active={tab}
        tabs={TABS.map((t) => ({ value: t, label: LABELS[t], count: data[t].length }))}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={ListIcon}
          title={tab === "open" ? "No open matches" : tab === "booked" ? "No keepers booked yet" : "No past matches"}
          body={
            tab === "past"
              ? "Matches you have played show up here."
              : "Post a match with the date, the pitch and the level. Keepers nearby apply with their rate."
          }
          action={
            tab === "past" ? undefined : (
              <Button href="/matches/new" size="md" withArrow>
                Post a match
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map(({ match, pending, keeper }) => {
            const status = MATCH_STATUS[match.status] ?? MATCH_STATUS.open;
            return (
              <li key={match.id}>
                <MatchCard
                  match={match}
                  href={`/matches/${match.id}`}
                  footer={
                    keeper ? (
                      <>
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar name={keeper.name} src={keeper.avatarUrl} size="sm" className="!h-7 !w-7" />
                          <span className="truncate font-medium text-fg">{keeper.name}</span>
                        </span>
                        <StatusBadge tone="success">Booked</StatusBadge>
                      </>
                    ) : tab === "past" ? (
                      <>
                        <span className="text-muted">Played</span>
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </>
                    ) : (
                      <>
                        <span className={pending > 0 ? "font-medium text-warning" : "text-muted"}>
                          {pending > 0 ? `${pending} ${pending === 1 ? "keeper" : "keepers"} applied` : "No applications yet"}
                        </span>
                        <span className="font-semibold text-accent-strong">{pending > 0 ? "Review" : "View"}</span>
                      </>
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
