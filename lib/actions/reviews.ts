"use server";

import { revalidatePath } from "next/cache";
import { loadBookingContext } from "@/lib/email/booking-context";
import { defer } from "@/lib/email/booking-emails";
import { notifyNewReview } from "@/lib/email/marketplace-emails";
import { createClient } from "@/lib/supabase/server";

export type ReviewActionState = { error: string | null; done?: boolean };

const COMMENT_MAX = 600;

export async function submitReviewAction(
  bookingId: string,
  matchId: string,
  rating: number,
  comment: string,
): Promise<ReviewActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Pick a rating from 1 to 5." };
  const text = comment.trim();
  if (text.length > COMMENT_MAX) return { error: `Keep your review under ${COMMENT_MAX} characters.` };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, goalkeeper_id")
    .eq("id", bookingId)
    .eq("player_id", user.id)
    .maybeSingle();
  if (!booking) return { error: "We couldn't find this booking." };

  const { error } = await supabase.from("reviews").insert({
    booking_id: booking.id,
    reviewer_id: user.id,
    goalkeeper_id: booking.goalkeeper_id,
    rating,
    comment: text || null,
  });

  if (error) {
    if (error.code === "23505") return { error: "You already reviewed this match." };
    // 42501: la política exige que el partido haya terminado.
    if (error.code === "42501") return { error: "You can review a keeper once the match has been played." };
    console.error("submitReviewAction failed", error);
    return { error: "We couldn't save your review. Please try again." };
  }

  defer(async () => {
    const ctx = await loadBookingContext(booking.id);
    if (ctx) await notifyNewReview(ctx, rating, text || null);
  });
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/keepers/${booking.goalkeeper_id}`);
  return { error: null, done: true };
}
