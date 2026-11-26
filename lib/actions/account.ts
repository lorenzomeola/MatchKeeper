"use server";

import { revalidatePath } from "next/cache";
import { defer } from "@/lib/email/booking-emails";
import { notifyAdminDeletionRequest } from "@/lib/email/admin-emails";
import { createClient } from "@/lib/supabase/server";

export async function requestAccountDeletionAction(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  // Una sola solicitud por cuenta: si ya existe, no se vuelve a avisar al admin.
  const { error } = await supabase.from("deletion_requests").insert({ profile_id: user.id });
  if (error) {
    if (error.code === "23505") return { error: null };
    console.error("requestAccountDeletionAction failed", error);
    return { error: "We couldn't send your request. Please try again." };
  }

  defer(() => notifyAdminDeletionRequest(user.id));
  revalidatePath("/profile");
  return { error: null };
}

export async function cancelAccountDeletionAction(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase.from("deletion_requests").delete().eq("profile_id", user.id);
  if (error) {
    console.error("cancelAccountDeletionAction failed", error);
    return { error: "We couldn't cancel your request. Please try again." };
  }
  revalidatePath("/profile");
  return { error: null };
}
