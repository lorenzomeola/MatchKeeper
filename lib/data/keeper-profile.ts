import { createClient } from "@/lib/supabase/server";

export type KeeperReview = { id: string; rating: number; comment: string | null; createdAt: string };

export type KeeperProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  city: string | null;
  bio: string | null;
  level: string | null;
  experienceYears: number | null;
  ageRange: string | null;
  approved: boolean;
  joinedAt: string;
  isSelf: boolean;
  gamesPlayed: number;
  avgRate: number | null;
  reviewCount: number;
  avgRating: number | null;
  reviews: KeeperReview[];
  /** Aplicación en común más reciente, para ofrecer "Message". */
  sharedApplicationId: string | null;
};

/** null si no existe, no es portero o el visor no tiene relación con él (RLS lo oculta). */
export async function loadKeeperProfile(keeperId: string, viewerId: string): Promise<KeeperProfile | null> {
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("profiles")
    .select("id, role, display_name, avatar_url, city, bio, level, experience_years, age_range, approved, created_at")
    .eq("id", keeperId)
    .maybeSingle();
  if (!p || p.role !== "goalkeeper") return null;

  const [{ data: stats }, { data: reviews }, { data: shared }] = await Promise.all([
    supabase.rpc("keeper_public_stats", { p_keeper: keeperId }),
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at")
      .eq("goalkeeper_id", keeperId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("applications")
      .select("id, created_at, matches!inner(created_by)")
      .eq("goalkeeper_id", keeperId)
      .eq("matches.created_by", viewerId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const s = Array.isArray(stats) ? stats[0] : stats;
  const num = (v: unknown) => (v == null ? null : Number(v));

  return {
    id: p.id,
    name: p.display_name,
    avatarUrl: p.avatar_url,
    city: p.city,
    bio: p.bio,
    level: p.level,
    experienceYears: p.experience_years,
    ageRange: p.age_range,
    approved: p.approved,
    joinedAt: p.created_at,
    isSelf: p.id === viewerId,
    gamesPlayed: s?.games_played ?? 0,
    avgRate: num(s?.avg_rate),
    reviewCount: s?.review_count ?? 0,
    avgRating: num(s?.avg_rating),
    reviews: (reviews ?? []).map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.created_at })),
    sharedApplicationId: shared?.[0]?.id ?? null,
  };
}
