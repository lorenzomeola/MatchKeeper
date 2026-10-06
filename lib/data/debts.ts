import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Lo que el portero debe todavía por disputas (RLS: solo lee las suyas). */
export async function loadMyDebtPence(supabase: Client, userId: string): Promise<number> {
  const { data } = await supabase
    .from("keeper_debts")
    .select("amount_pence, recovered_pence")
    .eq("goalkeeper_id", userId)
    .eq("status", "open");
  return (data ?? []).reduce((sum, d) => sum + (d.amount_pence - d.recovered_pence), 0);
}
