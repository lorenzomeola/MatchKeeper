import { redirect } from "next/navigation";
import { startKeeperOnboarding } from "@/lib/payments/connect";
import { createClient } from "@/lib/supabase/server";

// Stripe manda aquí cuando el enlace caducó o ya se usó: se genera uno nuevo.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "goalkeeper" || !profile.approved) redirect("/dashboard");

  let url: string;
  try {
    url = await startKeeperOnboarding({ id: user.id, email: user.email }, profile.display_name);
  } catch (e) {
    console.error("payments refresh failed", e);
    redirect("/payments/return");
  }
  redirect(url);
}
