"use server";

import { revalidatePath } from "next/cache";
import { loadMyStanding } from "@/lib/data/standing";
import { createClient } from "@/lib/supabase/server";

export type ApplicationActionState = { error: string | null; done?: boolean };

const RATE_MAX = 500;
const MESSAGE_MAX = 300;

export async function applyToMatchAction(
  _prevState: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const matchId = String(formData.get("matchId") ?? "");
  const rateRaw = String(formData.get("rate") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const rate = Number(rateRaw);

  if (!matchId || !rateRaw || Number.isNaN(rate) || rate <= 0) return { error: "Enter the rate you want for this match." };
  if (rate > RATE_MAX) return { error: `The rate can't be more than £${RATE_MAX}.` };
  if (message.length > MESSAGE_MAX) return { error: `Keep your message under ${MESSAGE_MAX} characters.` };

  const { data: payAccount } = await supabase
    .from("keeper_stripe_accounts")
    .select("payouts_enabled")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!payAccount?.payouts_enabled) return { error: "Set up payments from your dashboard before applying." };

  if ((await loadMyStanding(supabase, user.id)).level === "suspended") {
    return { error: "Your account is suspended from applying to new matches." };
  }

  const { error } = await supabase.from("applications").insert({
    match_id: matchId,
    goalkeeper_id: user.id,
    rate,
    message: message || null,
  });

  if (error) {
    // 23505: ya aplicó (índice único por partido y portero).
    if (error.code === "23505") return { error: "You already applied to this match." };
    console.error("applyToMatchAction failed", error);
    return { error: "We couldn't send your application. Please try again." };
  }

  revalidatePath(`/matches/${matchId}`);
  return { error: null, done: true };
}

export async function withdrawApplicationAction(
  applicationId: string,
  matchId: string,
): Promise<ApplicationActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId)
    .eq("goalkeeper_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("withdrawApplicationAction failed", error);
    return { error: "We couldn't withdraw your application. Please try again." };
  }

  revalidatePath(`/matches/${matchId}`);
  return { error: null, done: true };
}
