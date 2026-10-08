import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundOutsideApp } from "./external-events";
import { moveToReview } from "./release-booking";

async function logEvent(bookingId: string, type: string, data: Record<string, unknown>) {
  await createAdminClient().from("booking_events").insert({ booking_id: bookingId, type, data });
}

/**
 * Reembolso que Stripe notifica. Los de la app llegan con la reserva ya cancelada y no hacen nada; uno hecho a mano
 * en el panel de Stripe sobre una reserva activa la manda a revisión, para que un admin decida antes de pagar al portero.
 */
export async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  if (!charge.amount_refunded) return;
  const { data: booking } = await createAdminClient()
    .from("bookings")
    .select("id, status")
    .eq("stripe_charge_id", charge.id)
    .maybeSingle();
  if (!booking) return;

  const action = refundOutsideApp(booking.status);
  if (action === "ignore") return;
  const data = { charge: charge.id, refunded: charge.amount_refunded };
  await logEvent(booking.id, "refunded_outside_app", data);
  if (action === "review") await moveToReview(booking.id, "refunded_in_stripe");
  // Con la reserva ya pagada al portero no hay a quién retener el pago: queda en el registro y en los logs.
  else if (booking.status === "completed") console.error(`Refund made in Stripe on an already paid booking ${booking.id}`, data);
}

/** Una transferencia al portero revertida. Las reversiones de las disputas también pasan por aquí: solo se registra. */
export async function handleTransferReversed(event: Stripe.Event) {
  const transfer = event.data.object as Stripe.Transfer;
  const bookingId =
    transfer.metadata?.booking_id ?? (transfer.transfer_group?.startsWith("booking_") ? transfer.transfer_group.slice(8) : null);
  if (!bookingId) return;
  const { data: booking } = await createAdminClient().from("bookings").select("id").eq("id", bookingId).maybeSingle();
  if (!booking) return;
  await logEvent(booking.id, "transfer_reversed", { transfer: transfer.id, reversed: transfer.amount_reversed, amount: transfer.amount });
}
