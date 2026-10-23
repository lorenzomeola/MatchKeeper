"use server";

import { revalidatePath } from "next/cache";
import { cancelBooking } from "@/lib/payments/cancel-booking";
import { fullRefundPlan, noShowPlan } from "@/lib/payments/money";
import { releaseBooking } from "@/lib/payments/release-booking";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { LifecycleState } from "./booking-lifecycle";

export type ReviewDecision = "release" | "refund" | "refund_strike";

/** Un admin decide qué pasa con una reserva en revisión: pagar al portero, reembolsar, o reembolsar con strike. */
export async function resolveReviewAction(bookingId: string, decision: ReviewDecision): Promise<LifecycleState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { error: "Not authorized." };

  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select("id, status, payment_status, rate_pence, commission_pct")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return { error: "Booking not found." };
  if (b.status !== "under_review") return { error: "This booking is not waiting for review." };

  const free = b.payment_status === "none";
  let message = "Done.";
  try {
    if (decision === "release") {
      const res = await releaseBooking(bookingId);
      if (!res.released) return { error: free ? "The booking could not be marked as played." : "The payment could not be released." };
      await admin
        .from("booking_events")
        .insert({ booking_id: bookingId, type: "admin_resolved", actor_id: user.id, data: { decision } });
      message = free ? "Booking marked as played." : "Keeper paid.";
    } else {
      const plan =
        decision === "refund_strike"
          ? noShowPlan(b.rate_pence, Number(b.commission_pct))
          : fullRefundPlan(b.rate_pence, Number(b.commission_pct));
      const res = await cancelBooking({ bookingId, by: "admin", plan, reason: `admin_${decision}`, actorId: user.id });
      if (!res.cancelled) return { error: "This booking was already resolved." };
      message = free ? "Booking cancelled." : res.moneyPending ? "Cancelled. The refund is being processed." : "Team refunded.";
    }
  } catch (e) {
    console.error("resolveReviewAction failed", e);
    return { error: "We couldn't complete this. Nothing was changed twice: try again in a moment." };
  }

  revalidatePath("/admin/payments");
  return { error: null, done: true, message };
}
