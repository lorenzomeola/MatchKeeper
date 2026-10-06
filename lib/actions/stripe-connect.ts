"use server";

import { redirect } from "next/navigation";
import { startKeeperOnboarding } from "@/lib/payments/connect";
import { createClient } from "@/lib/supabase/server";

export type PaymentSetupState = { error: string | null };

export async function startPaymentSetupAction(): Promise<PaymentSetupState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "goalkeeper") return { error: "Only goalkeepers set up payments." };
  if (!profile.approved) return { error: "Your profile needs to be approved first." };

  let url: string;
  try {
    url = await startKeeperOnboarding({ id: user.id, email: user.email }, profile.display_name);
  } catch (e) {
    console.error("startPaymentSetupAction failed", e);
    return { error: "We couldn't open the payment setup. Please try again." };
  }
  redirect(url);
}
