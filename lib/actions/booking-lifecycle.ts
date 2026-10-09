"use server";

import { revalidatePath } from "next/cache";
import { cancelBooking } from "@/lib/payments/cancel-booking";
import { CHECKIN_RADIUS_M, CHECKIN_WINDOW_MIN } from "@/lib/payments/config";
import { checkInAllowed, distanceMeters, teamCanRespond } from "@/lib/payments/checkin";
import { cancellationPlan, hoursBeforeStart, noShowPlan } from "@/lib/payments/money";
import { decideRelease } from "@/lib/payments/release";
import { moveToReview, releaseBooking } from "@/lib/payments/release-booking";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { defer, notifyCheckedIn, notifyTeamResponded } from "@/lib/email/booking-emails";
import { notifyAdminPaymentProblem } from "@/lib/email/admin-emails";

export type LifecycleState = { error: string | null; done?: boolean; message?: string };

const NOTE_MAX = 500;

const CHECKIN_ERRORS = {
  too_early: `Check-in opens ${CHECKIN_WINDOW_MIN} minutes before kick-off.`,
  too_late: `The check-in window closed ${CHECKIN_WINDOW_MIN} minutes after kick-off. Contact support if you were at the pitch.`,
  too_far: `You need to be within ${CHECKIN_RADIUS_M} metres of the pitch to check in.`,
} as const;

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function checkInAction(bookingId: string, lat: number, lng: number): Promise<LifecycleState> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { error: "We couldn't read your location." };
  }
  const { supabase, user } = await currentUser();
  if (!user) return { error: "You need to be logged in." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, goalkeeper_id, match_id, keeper_checked_in_at")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.goalkeeper_id !== user.id) return { error: "This booking is not yours." };
  if (booking.status !== "confirmed") return { error: "This booking is not active." };
  if (booking.keeper_checked_in_at) return { error: "You already checked in." };

  const { data: match } = await supabase
    .from("matches")
    .select("id, lat, lng, starts_at")
    .eq("id", booking.match_id)
    .maybeSingle();
  if (!match) return { error: "Match not found." };

  const distanceM = Math.round(distanceMeters({ lat, lng }, { lat: match.lat, lng: match.lng }));
  const check = checkInAllowed({
    now: new Date(),
    startsAt: new Date(match.starts_at),
    distanceM,
    windowMin: CHECKIN_WINDOW_MIN,
    radiusM: CHECKIN_RADIUS_M,
  });
  if (!check.ok) return { error: CHECKIN_ERRORS[check.reason] };

  // Un check-in no se puede deshacer: la condición evita pisar uno existente.
  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("bookings")
    .update({
      keeper_checked_in_at: new Date().toISOString(),
      check_in_lat: lat,
      check_in_lng: lng,
      check_in_distance_m: distanceM,
    })
    .eq("id", bookingId)
    .is("keeper_checked_in_at", null)
    .select("id");
  if (!updated?.length) return { error: "You already checked in." };

  await admin
    .from("booking_events")
    .insert({ booking_id: bookingId, type: "keeper_checked_in", actor_id: user.id, data: { lat, lng, distance_m: distanceM } });
  defer(() => notifyCheckedIn(bookingId));
  revalidatePath(`/matches/${match.id}`);
  return { error: null, done: true };
}

async function loadTeamBooking(bookingId: string) {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "You need to be logged in." as const };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, payment_status, player_id, match_id, auto_release_at, team_response, keeper_checked_in_at, rate_pence, commission_pct")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.player_id !== user.id) return { error: "This booking is not yours." as const };
  if (booking.status !== "confirmed" || booking.payment_status !== "held") {
    return { error: "This booking can't be changed any more." as const };
  }
  if (booking.team_response) return { error: "You already answered for this match." as const };

  const { data: match } = await supabase.from("matches").select("id, starts_at").eq("id", booking.match_id).maybeSingle();
  if (!match) return { error: "Match not found." as const };
  if (!teamCanRespond(new Date(), new Date(match.starts_at), new Date(booking.auto_release_at))) {
    return { error: "You can answer from the start of the match until the payment is released." as const };
  }
  return { error: null, user, booking, matchId: match.id as string };
}

export async function confirmMatchPlayedAction(bookingId: string): Promise<LifecycleState> {
  const loaded = await loadTeamBooking(bookingId);
  if (loaded.error) return { error: loaded.error };

  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("bookings")
    .update({ team_response: "confirmed", team_responded_at: new Date().toISOString() })
    .eq("id", bookingId)
    .is("team_response", null)
    .select("id");
  if (!updated?.length) return { error: "You already answered for this match." };

  await admin
    .from("booking_events")
    .insert({ booking_id: bookingId, type: "team_confirmed", actor_id: loaded.user.id });
  defer(() => notifyTeamResponded(bookingId));

  // Si la Transfer falla, la respuesta queda guardada y el cron lo reintenta.
  try {
    await releaseBooking(bookingId);
  } catch (e) {
    console.error("confirmMatchPlayedAction release failed", e);
    defer(() => notifyAdminPaymentProblem(bookingId, "release", e));
  }
  revalidatePath(`/matches/${loaded.matchId}`);
  return { error: null, done: true };
}

export async function reportMatchAction(
  bookingId: string,
  kind: "no_show" | "other",
  note: string,
): Promise<LifecycleState> {
  const text = note.trim();
  if (text.length > NOTE_MAX) return { error: `Keep the note under ${NOTE_MAX} characters.` };
  if (kind === "other" && text.length < 10) return { error: "Tell us briefly what went wrong." };

  const loaded = await loadTeamBooking(bookingId);
  if (loaded.error) return { error: loaded.error };

  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("bookings")
    .update({
      team_response: kind === "no_show" ? "reported_no_show" : "reported_other",
      team_responded_at: new Date().toISOString(),
      team_report_note: text || null,
    })
    .eq("id", bookingId)
    .is("team_response", null)
    .select("id");
  if (!updated?.length) return { error: "You already answered for this match." };

  await admin
    .from("booking_events")
    .insert({ booking_id: bookingId, type: "team_reported", actor_id: loaded.user.id, data: { kind, note: text || null } });
  defer(() => notifyTeamResponded(bookingId));

  // Sin check-in y con no-show el reembolso y el strike son automáticos; en el resto decide un admin.
  const decision = decideRelease({
    checkedIn: Boolean(loaded.booking.keeper_checked_in_at),
    teamResponse: kind === "no_show" ? "reported_no_show" : "reported_other",
    now: new Date(),
    autoReleaseAt: new Date(loaded.booking.auto_release_at),
  });
  if (decision === "refund_with_strike") {
    const result = await cancelBooking({
      bookingId,
      by: "system",
      plan: noShowPlan(loaded.booking.rate_pence, Number(loaded.booking.commission_pct)),
      reason: "keeper_no_show",
      actorId: loaded.user.id,
    });
    revalidatePath(`/matches/${loaded.matchId}`);
    return {
      error: null,
      done: true,
      message: result.moneyPending ? "Reported. Your refund is being processed." : "Reported. You have been refunded in full.",
    };
  }
  await moveToReview(bookingId, `team_reported_${kind}`, loaded.user.id);
  revalidatePath(`/matches/${loaded.matchId}`);
  return { error: null, done: true, message: "Reported. We will review it." };
}

/** El equipo o el portero cancelan una reserva confirmada. Las consecuencias salen de `cancellationPlan`. */
export async function cancelBookingAction(bookingId: string): Promise<LifecycleState> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "You need to be logged in." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, player_id, goalkeeper_id, match_id, rate_pence, commission_pct")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { error: "Booking not found." };
  const actor = booking.player_id === user.id ? "team" : booking.goalkeeper_id === user.id ? "keeper" : null;
  if (!actor) return { error: "This booking is not yours." };
  if (booking.status !== "confirmed") return { error: "This booking can't be cancelled any more." };

  const { data: match } = await supabase.from("matches").select("id, starts_at, ends_at").eq("id", booking.match_id).maybeSingle();
  if (!match) return { error: "Match not found." };
  const now = new Date();
  // El equipo puede cancelar hasta el final del partido (después ya confirma o reporta); el portero, hasta el inicio.
  if (actor === "team" ? now >= new Date(match.ends_at) : now >= new Date(match.starts_at)) {
    return { error: "It is too late to cancel this booking." };
  }

  const plan = cancellationPlan(booking.rate_pence, Number(booking.commission_pct), actor, hoursBeforeStart(new Date(match.starts_at), now));
  const result = await cancelBooking({ bookingId, by: actor, plan, reason: `${actor}_cancelled`, actorId: user.id });
  if (!result.cancelled) return { error: "This booking was already cancelled." };

  revalidatePath(`/matches/${match.id}`);
  return {
    error: null,
    done: true,
    message: result.moneyPending ? "Cancelled. The refund is being processed." : "Booking cancelled.",
  };
}
