import { isNewSince } from "@/lib/match-list-status";
import { sameCategory } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

/** Aplicaciones pendientes en partidos propios que el equipo aún no ha visto. */
export async function countNewApplications(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("created_at, matches!inner(created_by, status, ends_at, applications_seen_at)")
    .eq("status", "pending")
    .eq("matches.created_by", userId)
    .eq("matches.status", "open")
    .gte("matches.ends_at", new Date().toISOString());
  const rows = (data ?? []) as unknown as { created_at: string; matches: { applications_seen_at: string | null } }[];
  return rows.filter((a) => isNewSince(a.created_at, a.matches.applications_seen_at)).length;
}

/** Hay partidos abiertos de su categoría, publicados desde que abrió Explore, a los que aún no ha aplicado. */
export async function hasNewOpenMatches(userId: string, category: string | null, seenAt: string | null): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase
    .from("matches")
    .select("id, category, created_at, updated_at")
    .eq("status", "open")
    .gte("ends_at", new Date().toISOString())
    .neq("created_by", userId)
    .limit(100);
  if (seenAt) {
    const iso = new Date(seenAt).toISOString();
    query = query.or(`created_at.gt.${iso},updated_at.gt.${iso}`);
  }
  const [{ data: open }, { data: applied }] = await Promise.all([
    query,
    supabase.from("applications").select("match_id").eq("goalkeeper_id", userId),
  ]);
  const appliedIds = new Set((applied ?? []).map((a) => a.match_id));
  return (open ?? []).some((m) => !appliedIds.has(m.id) && sameCategory(m.category, category));
}
