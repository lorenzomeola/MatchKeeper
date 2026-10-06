"use server";

import { redirect } from "next/navigation";
import { BookingError, startCheckout } from "@/lib/payments/checkout";
import { TERMS_VERSION } from "@/lib/payments/config";
import { createClient } from "@/lib/supabase/server";

export type BookingActionState = { error: string | null };

export async function startCheckoutAction(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const applicationId = String(formData.get("applicationId") ?? "");
  if (!applicationId) return { error: "Choose a keeper to book." };
  if (formData.get("terms") !== "on") {
    return { error: "Accept the Terms and the cancellation policy to continue." };
  }

  let url: string;
  try {
    url = await startCheckout(supabase, { id: user.id, email: user.email }, applicationId, TERMS_VERSION);
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error("startCheckoutAction failed", e);
    return { error: "We couldn't open the payment page. Please try again." };
  }
  redirect(url);
}
