import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExploreMap } from "@/components/app/explore-map";
import { MarkSeen } from "@/components/app/mark-seen";
import { loadExplore } from "@/lib/data/explore";
import { isNewSince } from "@/lib/match-list-status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Map", robots: { index: false } };

export default async function MapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const isKeeper = me?.role === "goalkeeper";
  const matches = await loadExplore(user.id, isKeeper, me?.category ?? "men");
  const seenAt: string | null = me?.explore_seen_at ?? null;
  const hasNew = isKeeper && me?.approved === true && matches.some((m) => m.kind === "open" && isNewSince(m.created_at, seenAt));

  return (
    <>
      {hasNew && <MarkSeen />}
      <ExploreMap matches={matches} isKeeper={isKeeper} approved={me?.approved === true} />
    </>
  );
}
