"use server";

import { revalidatePath } from "next/cache";
import { defer } from "@/lib/email/booking-emails";
import { notifyAdminReport } from "@/lib/email/admin-emails";
import { KEEPER_VIDEO_BUCKET } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Solo rutas con la forma que genera la subida: <uuid del portero>/clip-<marca de tiempo>.<ext>
const CLIP_PATH = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/clip-\d+\.(mp4|mov|webm)$/i;

export async function reportClipAction(path: string): Promise<{ error: string | null }> {
  const match = CLIP_PATH.exec(path);
  if (!match) return { error: "That clip could not be found." };
  const keeperId = match[1];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };
  if (user.id === keeperId) return { error: "You can remove your own clips from your profile." };

  const { data, error } = await supabase
    .from("reports")
    .insert({ reporter_id: user.id, reported_id: keeperId, reason: "Inappropriate clip", details: `Clip: ${path}` })
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("reportClipAction failed", error);
    return { error: "We couldn't send the report. Please try again." };
  }
  if (data) defer(() => notifyAdminReport(data.id));
  return { error: null };
}

export async function adminRemoveClipAction(path: string): Promise<{ error: string | null }> {
  const match = CLIP_PATH.exec(path);
  if (!match) return { error: "That clip could not be found." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return { error: "Not authorised." };

  const { error } = await createAdminClient().storage.from(KEEPER_VIDEO_BUCKET).remove([path]);
  if (error) {
    console.error("adminRemoveClipAction failed", error);
    return { error: "We couldn't remove the clip. Please try again." };
  }
  revalidatePath(`/admin/users/${match[1]}`);
  revalidatePath(`/keepers/${match[1]}`);
  return { error: null };
}
