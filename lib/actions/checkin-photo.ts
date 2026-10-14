"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { defer, notifyKeeperPhoto } from "@/lib/email/booking-emails";
import type { LifecycleState } from "@/lib/actions/booking-lifecycle";
import { CHECKIN_PHOTO_BUCKET, CHECKIN_PHOTO_MAX_BYTES, canAddCheckInPhoto } from "@/lib/payments/checkin-photo";
import { normalizeCheckInPhoto } from "@/lib/payments/checkin-photo-image";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** El portero añade una foto de dónde está. Se valida, se recodifica sin metadatos y se guarda en un bucket privado. */
export async function addCheckInPhotoAction(bookingId: string, formData: FormData): Promise<LifecycleState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first." };
  if (file.size > CHECKIN_PHOTO_MAX_BYTES) return { error: "That photo is too big. Try again." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, goalkeeper_id, match_id, keeper_checked_in_at, check_in_photo_path")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.goalkeeper_id !== user.id) return { error: "This booking is not yours." };
  const { data: match } = await supabase.from("matches").select("id, ends_at").eq("id", booking.match_id).maybeSingle();
  if (!match) return { error: "Match not found." };
  if (
    !canAddCheckInPhoto({
      status: booking.status,
      checkedIn: Boolean(booking.keeper_checked_in_at),
      hasPhoto: Boolean(booking.check_in_photo_path),
      now: new Date(),
      endsAt: new Date(match.ends_at),
    })
  ) {
    return { error: "You can't add a photo to this booking any more." };
  }

  const photo = await normalizeCheckInPhoto(Buffer.from(await file.arrayBuffer()));
  if (!photo) return { error: "We couldn't use that file. Take a new photo." };

  const admin = createAdminClient();
  const path = `${bookingId}/${randomUUID()}.jpg`;
  const { error: uploadError } = await admin.storage
    .from(CHECKIN_PHOTO_BUCKET)
    .upload(path, photo, { contentType: "image/jpeg", upsert: false });
  if (uploadError) {
    console.error("check-in photo upload failed", uploadError);
    return { error: "We couldn't save the photo. Please try again." };
  }

  // La condición evita que dos subidas a la vez dejen una foto huérfana en el bucket.
  const { data: saved } = await admin
    .from("bookings")
    .update({ check_in_photo_path: path, check_in_photo_at: new Date().toISOString() })
    .eq("id", bookingId)
    .is("check_in_photo_path", null)
    .select("id");
  if (!saved?.length) {
    await admin.storage.from(CHECKIN_PHOTO_BUCKET).remove([path]);
    return { error: "You already added a photo." };
  }

  defer(() => notifyKeeperPhoto(bookingId));
  revalidatePath(`/matches/${booking.match_id}`);
  return { error: null, done: true };
}

/** El portero retira su foto: se borra el archivo y deja de verla el equipo. */
export async function removeCheckInPhotoAction(bookingId: string): Promise<LifecycleState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, goalkeeper_id, match_id, check_in_photo_path")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.goalkeeper_id !== user.id) return { error: "This booking is not yours." };
  if (!booking.check_in_photo_path) return { error: null, done: true };

  const admin = createAdminClient();
  const { error: removeError } = await admin.storage.from(CHECKIN_PHOTO_BUCKET).remove([booking.check_in_photo_path]);
  if (removeError) {
    console.error("check-in photo removal failed", removeError);
    return { error: "We couldn't remove the photo. Please try again." };
  }
  await admin.from("bookings").update({ check_in_photo_path: null, check_in_photo_at: null }).eq("id", bookingId);

  revalidatePath(`/matches/${booking.match_id}`);
  return { error: null, done: true };
}
