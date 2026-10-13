import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { defer, notifyBookingInReview, notifyMatchCompleted, notifyReleased } from "@/lib/email/booking-emails";

/**
 * Transfiere dinero del cobro al portero. Idempotente: si ya hay una transferencia del grupo la reutiliza
 * (las claves de idempotencia de Stripe caducan a las 24 h). Antes descuenta las deudas abiertas del portero
 * (disputas perdidas por su culpa): si el pago se queda en cero no hay transferencia y devuelve `transfer: null`.
 */
export async function transferToKeeper(input: {
  bookingId: string;
  goalkeeperId: string;
  chargeId: string;
  amountPence: number;
}): Promise<{ transfer: Stripe.Transfer | null; deductedPence: number }> {
  const admin = createAdminClient();
  const stripe = getStripe();

  const { data: account } = await admin
    .from("keeper_stripe_accounts")
    .select("stripe_account_id, payouts_enabled")
    .eq("profile_id", input.goalkeeperId)
    .maybeSingle();
  if (!account?.payouts_enabled) throw new Error("Keeper cannot receive payouts");

  const transferGroup = `booking_${input.bookingId}`;
  const existing = await stripe.transfers.list({ transfer_group: transferGroup, limit: 1 });
  if (existing.data[0]) {
    return { transfer: existing.data[0], deductedPence: Math.max(0, input.amountPence - existing.data[0].amount) };
  }

  // La reserva del descuento es idempotente por reserva: un reintento tras un fallo calcula el mismo importe.
  const { data: deducted, error } = await admin.rpc("reserve_debt_deduction", {
    p_booking: input.bookingId,
    p_keeper: input.goalkeeperId,
    p_max: input.amountPence,
  });
  if (error) throw error;
  const deductedPence = deducted ?? 0;
  const netPence = input.amountPence - deductedPence;
  if (netPence <= 0) return { transfer: null, deductedPence };

  const transfer = await stripe.transfers.create(
    {
      amount: netPence,
      currency: "gbp",
      destination: account.stripe_account_id,
      transfer_group: transferGroup,
      // Liga la transferencia al cobro: funciona aunque el dinero aún figure como pendiente en el saldo.
      source_transaction: input.chargeId,
      metadata: { booking_id: input.bookingId, debt_deducted_pence: String(deductedPence) },
    },
    { idempotencyKey: `release:${input.bookingId}` },
  );
  return { transfer, deductedPence };
}

/**
 * Paga al portero su tarifa íntegra y cierra la reserva. Idempotente: si ya se liberó no hace nada.
 * Vale para reservas confirmadas y para las que un admin resuelve desde revisión.
 * Una reserva sin cobro (payment_status 'none', beta) solo se cierra: no hay dinero que transferir.
 */
export async function releaseBooking(bookingId: string): Promise<{ released: boolean }> {
  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, status, payment_status, goalkeeper_id, match_id, keeper_payout_pence, stripe_charge_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) throw new Error("Booking not found");
  const free = booking.payment_status === "none";
  if (!free && booking.payment_status !== "held") return { released: false };
  if (!["confirmed", "under_review"].includes(booking.status)) return { released: false };
  if (!free && (!booking.keeper_payout_pence || !booking.stripe_charge_id)) throw new Error("Booking has no payout data");

  const { transfer, deductedPence } = free
    ? { transfer: null, deductedPence: 0 }
    : await transferToKeeper({
        bookingId,
        goalkeeperId: booking.goalkeeper_id,
        chargeId: booking.stripe_charge_id!,
        amountPence: booking.keeper_payout_pence!,
      });

  const { data: updated } = await admin
    .from("bookings")
    .update({
      status: "completed",
      ...(free ? {} : { payment_status: "released" }),
      stripe_transfer_id: transfer?.id ?? null,
      released_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .in("status", ["confirmed", "under_review"])
    .select("id");
  if (!updated?.length) return { released: false };

  // Con 2 porteros, el partido se da por cerrado cuando ya no queda ninguna reserva por liberar.
  const { count: stillOpen } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("match_id", booking.match_id)
    .in("status", ["confirmed", "under_review", "pending_payment"]);
  if (!stillOpen) await admin.from("matches").update({ status: "completed" }).eq("id", booking.match_id);
  await admin.from("booking_events").insert({
    booking_id: bookingId,
    type: free ? "completed_without_payment" : "released",
    data: free
      ? {}
      : { transfer: transfer?.id ?? null, amount: booking.keeper_payout_pence! - deductedPence, debt_deducted: deductedPence },
  });
  if (free) {
    defer(() => notifyMatchCompleted(bookingId));
    return { released: true };
  }
  const paidPence = booking.keeper_payout_pence! - deductedPence;
  defer(() => notifyReleased(bookingId, { amountPence: paidPence, debtPence: deductedPence }));
  return { released: true };
}

/** Pasa a revisión de un admin una reserva que no se puede liberar sola. Solo actúa una vez. */
export async function moveToReview(bookingId: string, reason: string, actorId: string | null = null) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .update({ status: "under_review" })
    .eq("id", bookingId)
    .eq("status", "confirmed")
    .select("id");
  if (!data?.length) return false;
  await admin
    .from("booking_events")
    .insert({ booking_id: bookingId, type: "moved_to_review", actor_id: actorId, data: { reason } });
  defer(() => notifyBookingInReview(bookingId, reason));
  return true;
}
