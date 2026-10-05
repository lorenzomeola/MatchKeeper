import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completeness, profileChecklist, valuesFromRow } from "@/lib/profile";
import { KeeperHome } from "./keeper-home";
import { PlayerHome } from "./player-home";

export const metadata: Metadata = { title: "Home", robots: { index: false } };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/signup");

  const isKeeper = profile.role === "goalkeeper";

  let teamName = "";
  if (!isKeeper) {
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    teamName = team?.name ?? "";
  }

  const values = valuesFromRow(profile, teamName);
  const rating = completeness(profileChecklist(isKeeper ? "goalkeeper" : "player", values));

  return isKeeper ? (
    <KeeperHome userId={user.id} profile={profile} rating={rating} />
  ) : (
    <PlayerHome userId={user.id} profile={profile} teamName={teamName} kind={values.playerKind} rating={rating} />
  );
}
