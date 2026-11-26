"use server";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function markExploreSeenAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("profiles").update({ explore_seen_at: new Date().toISOString() }).eq("id", user.id);
  if (error) console.error("markExploreSeenAction failed", error);
}

export async function markApplicationsSeenAction(matchId: string): Promise<void> {
  if (!UUID.test(matchId)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_applications_seen", { p_match: matchId });
  if (error) console.error("markApplicationsSeenAction failed", error);
}
