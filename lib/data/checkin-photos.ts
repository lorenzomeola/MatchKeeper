import "server-only";
import { CHECKIN_PHOTO_BUCKET, CHECKIN_PHOTO_VIEW_SECONDS } from "@/lib/payments/checkin-photo";
import { createAdminClient } from "@/lib/supabase/admin";

/** Enlaces temporales a las fotos. Solo pasar rutas leídas con la sesión del usuario (RLS): aquí no se comprueba quién mira. */
export async function signedCheckInPhotoUrls(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return urls;

  const { data, error } = await createAdminClient().storage
    .from(CHECKIN_PHOTO_BUCKET)
    .createSignedUrls(unique, CHECKIN_PHOTO_VIEW_SECONDS);
  if (error) {
    console.error("signing check-in photo urls failed", error);
    return urls;
  }
  for (const item of data ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  return urls;
}
