import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { longDate, splitAddress, timeRange } from "@/lib/format";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { defer, notifyBookingConfirmed, notifyCheckoutExpired } from "@/lib/email/booking-emails";
import { appUrl } from "./app-url";
import { CHECKOUT_TTL_MINUTES, COMMISSION_PCT } from "./config";
import { calculateTotals } from "./money";

/** Error con un mensaje apto para enseñar al usuario. */
export class BookingError extends Error {}

type Booker = { id: string; email?: string };

/**
 * Crea la reserva pendiente de pago y la sesión de Stripe Checkout, y devuelve la URL de pago.
 * Si ya había un intento pendiente para el mismo portero y sigue abierto, lo reutiliza.
 */
export async function startCheckout(
  supabase: SupabaseClient,
  user: Booker,
  applicationId: string,
  termsVersion: string,
): Promise<string> {
  const admin = createAdminClient();
  const stripe = getStripe();

  const { data: app } = await admin
    .from("applications")
    .select("id, match_id, goalkeeper_id, rate, status")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.status !== "pending") throw new BookingError("This application is no longer available.");

  const { data: match } = await admin
    .from("matches")
    .select("id, created_by, address, starts_at, ends_at, status")
    .eq("id", app.match_id)
    .maybeSingle();
  if (!match || match.created_by !== user.id) throw new BookingError("You can't book a keeper for this match.");
  if (match.status !== "open") throw new BookingError("This match already has a keeper.");

  const { data: prev } = await admin
    .from("bookings")
    .select("id, application_id, status, stripe_checkout_session_id")
    .eq("match_id", match.id)
    .neq("status", "cancelled")
    .maybeSingle();
  if (prev) {
    if (prev.status !== "pending_payment") throw new BookingError("This match already has a keeper.");
    if (prev.stripe_checkout_session_id) {
      const old = await stripe.checkout.sessions.retrieve(prev.stripe_checkout_session_id);
      if (old.status === "open" && old.url && prev.application_id === applicationId) return old.url;
      if (old.status === "complete" && old.payment_status === "paid") {
        await confirmCheckoutSession(old.id);
        throw new BookingError("This match is already booked.");
      }
      if (old.status === "open") await stripe.checkout.sessions.expire(old.id);
    }
    // Sin dinero de por medio: el intento anterior se descarta y se empieza de nuevo.
    await admin.from("bookings").delete().eq("id", prev.id).eq("status", "pending_payment");
  }

  const { data: bookingId, error: rpcError } = await supabase.rpc("accept_application", {
    p_application_id: applicationId,
    p_terms_version: termsVersion,
  });
  if (rpcError || !bookingId) {
    console.error("accept_application failed", rpcError);
    if (rpcError?.message?.includes("already booked at that time")) {
      throw new BookingError("This keeper is already booked for another match at that time.");
    }
    throw new BookingError("We couldn't start the booking. The keeper may no longer be available.");
  }

  // Importes siempre calculados aquí en peniques, nunca recibidos del navegador.
  const ratePence = Math.round(Number(app.rate) * 100);
  const totals = calculateTotals(ratePence, COMMISSION_PCT);
  const { error: amountsError } = await admin
    .from("bookings")
    .update({
      rate_pence: totals.ratePence,
      platform_fee_pence: totals.platformFeePence,
      total_pence: totals.totalPence,
      keeper_payout_pence: totals.ratePence,
      commission_pct: COMMISSION_PCT,
    })
    .eq("id", bookingId);
  if (amountsError) throw amountsError;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: bookingId,
      customer_email: user.email,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_MINUTES * 60,
      payment_method_options: { card: { request_three_d_secure: "any" } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: totals.totalPence,
            product_data: {
              name: `Goalkeeper at ${splitAddress(match.address).name}`,
              description: `${longDate(match.starts_at)}, ${timeRange(match.starts_at, match.ends_at)}. Includes the MatchKeeper service fee.`,
            },
          },
        },
      ],
      payment_intent_data: {
        transfer_group: `booking_${bookingId}`,
        statement_descriptor: "MATCHKEEPER",
        receipt_email: user.email,
        metadata: { booking_id: bookingId },
      },
      metadata: { booking_id: bookingId },
      success_url: `${appUrl()}/payments/booked?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/matches/${match.id}`,
    },
    { idempotencyKey: `checkout:${bookingId}` },
  );
  if (!session.url) throw new Error("Checkout session has no URL");

  await admin.from("bookings").update({ stripe_checkout_session_id: session.id }).eq("id", bookingId);
  return session.url;
}

/** Confirma la reserva si Stripe dice que la sesión está pagada. Idempotente. */
export async function confirmCheckoutSession(sessionId: string, expectedPlayerId?: string) {
  const admin = createAdminClient();
  const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) throw new Error("Checkout session has no booking");

  const { data: booking } = await admin
    .from("bookings")
    .select("id, match_id, player_id, total_pence")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) throw new Error("Booking not found");
  if (expectedPlayerId && booking.player_id !== expectedPlayerId) throw new Error("Booking belongs to another user");

  if (session.payment_status !== "paid") return { paid: false, matchId: booking.match_id as string };

  // El importe cobrado debe ser el que el servidor calculó para esta reserva.
  if (session.amount_total !== booking.total_pence) throw new Error("Charged amount does not match the booking");

  const intent = session.payment_intent as Stripe.PaymentIntent | null;
  const charge = typeof intent?.latest_charge === "string" ? intent.latest_charge : (intent?.latest_charge?.id ?? null);
  const { error } = await admin.rpc("confirm_booking_payment", {
    p_booking_id: bookingId,
    p_payment_intent: intent?.id ?? null,
    p_charge: charge,
  });
  if (error) throw error;
  // Los avisos llevan clave por reserva: confirmar dos veces (webhook y página de retorno) no los duplica.
  defer(() => notifyBookingConfirmed(bookingId));
  return { paid: true, matchId: booking.match_id as string };
}

/** Sesión caducada sin pago: la reserva pendiente se descarta y la candidatura sigue disponible. */
export async function discardExpiredCheckout(sessionId: string) {
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("bookings")
    .select("id")
    .eq("stripe_checkout_session_id", sessionId)
    .eq("status", "pending_payment");
  // El aviso se prepara antes de borrar la reserva, porque después ya no hay de dónde sacar los datos.
  for (const b of pending ?? []) {
    try {
      await notifyCheckoutExpired(b.id);
    } catch (e) {
      console.error("checkout expired email failed", e);
    }
  }
  await admin
    .from("bookings")
    .delete()
    .eq("stripe_checkout_session_id", sessionId)
    .eq("status", "pending_payment");
}
