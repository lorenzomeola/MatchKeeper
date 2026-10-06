import { keeperStanding } from "@/lib/strikes";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Estado de strikes del propio portero (RLS: solo lee los suyos). */
export async function loadMyStanding(supabase: Client, userId: string) {
  const { data } = await supabase.from("strikes").select("kind, created_at, waived_at").eq("goalkeeper_id", userId);
  return keeperStanding(
    (data ?? []).map((s) => ({
      kind: s.kind,
      createdAt: new Date(s.created_at),
      waivedAt: s.waived_at ? new Date(s.waived_at) : null,
    })),
    new Date(),
  );
}
