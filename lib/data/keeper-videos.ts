import "server-only";
import { KEEPER_VIDEO_BUCKET, KEEPER_VIDEO_MAX, type KeeperVideo } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

const VIEW_SECONDS = 60 * 60;

async function videoPaths(keeperId: string): Promise<string[]> {
  const { data, error } = await createAdminClient()
    .storage.from(KEEPER_VIDEO_BUCKET)
    .list(keeperId, { limit: KEEPER_VIDEO_MAX + 5, sortBy: { column: "created_at", order: "asc" } });
  if (error) {
    console.error("listing keeper videos failed", error);
    return [];
  }
  // Las entradas sin id son carpetas o marcadores, no archivos.
  return (data ?? []).filter((f) => f.id).map((f) => `${keeperId}/${f.name}`);
}

/** Clips con enlace temporal. Llamar solo si el visor ya pudo leer el perfil del portero con su sesión (RLS). */
export async function loadKeeperVideos(keeperId: string): Promise<KeeperVideo[]> {
  const paths = await videoPaths(keeperId);
  if (paths.length === 0) return [];
  const { data, error } = await createAdminClient().storage.from(KEEPER_VIDEO_BUCKET).createSignedUrls(paths, VIEW_SECONDS);
  if (error) {
    console.error("signing keeper videos failed", error);
    return [];
  }
  return (data ?? []).flatMap((s) => (s.path && s.signedUrl ? [{ path: s.path, url: s.signedUrl }] : []));
}

export async function keeperVideoCounts(keeperIds: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(keeperIds)];
  const counts = await Promise.all(unique.map(async (id) => [id, (await videoPaths(id)).length] as const));
  return new Map(counts);
}
