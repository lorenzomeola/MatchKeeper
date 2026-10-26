import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { defer, notifyBookingConfirmed } from "@/lib/email/booking-emails";
import { BookingError } from "./checkout";

/**
 * Elige portero sin cobro (beta): la reserva nace confirmada. La función SQL se niega si los pagos están
 * encendidos, así que esto no puede usarse para saltarse un cobro. Devuelve el partido para volver a su página.
 */
export async function acceptWithoutPayment(
  supabase: SupabaseClient,
  applicationId: string,
  termsVersion: string,
): Promise<string> {
  const { data: app } = await supabase.from("applications").select("match_id").eq("id", applicationId).maybeSingle();
  if (!app) throw new BookingError("This application is no longer available.");

  const { data: bookingId, error } = await supabase.rpc("accept_application_free", {
    p_application_id: applicationId,
    p_terms_version: termsVersion,
  });
  if (error || !bookingId) {
    console.error("accept_application_free failed", error);
    const message = error?.message ?? "";
    if (message.includes("already booked at that time")) {
      throw new BookingError("This keeper is already booked for another match at that time.");
    }
    if (message.includes("Match is full") || message.includes("Match is not open")) {
      throw new BookingError("This match already has all its keepers.");
    }
    if (message.includes("Keeper is suspended")) throw new BookingError("This keeper can't be booked right now.");
    if (message.includes("Payments are enabled")) {
      throw new BookingError("Bookings just changed. Reload the page and try again.");
    }
    throw new BookingError("We couldn't confirm the booking. The keeper may no longer be available.");
  }

  defer(() => notifyBookingConfirmed(bookingId));
  return app.match_id as string;
}
