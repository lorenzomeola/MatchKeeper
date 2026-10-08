import type Stripe from "stripe";
import { confirmCheckoutSession, discardExpiredCheckout } from "@/lib/payments/checkout";
import { handleDisputeEvent } from "@/lib/payments/dispute-handlers";
import { handleChargeRefunded, handleTransferReversed } from "@/lib/payments/refund-events";
import { receiveStripeEvent } from "@/lib/payments/webhook";

// Eventos de la cuenta de MatchKeeper. Los de las cuentas de los porteros llegan a /api/stripe/connect-webhook.
export async function POST(req: Request) {
  const received = await receiveStripeEvent(req, "STRIPE_WEBHOOK_SECRET");
  if ("response" in received) return received.response;
  const { event, release } = received;

  try {
    // Sesiones sin booking_id no son de una reserva de MatchKeeper: se ignoran con 200 para que Stripe no reintente.
    const session = event.data.object as Stripe.Checkout.Session;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        if (session.metadata?.booking_id) await confirmCheckoutSession(session.id);
        break;
      case "checkout.session.expired":
        if (session.metadata?.booking_id) await discardExpiredCheckout(session.id);
        break;
      case "charge.dispute.created":
      case "charge.dispute.updated":
      case "charge.dispute.closed":
      case "charge.dispute.funds_withdrawn":
      case "charge.dispute.funds_reinstated":
        await handleDisputeEvent(event);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event);
        break;
      case "transfer.reversed":
        await handleTransferReversed(event);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error(`Stripe webhook ${event.type} failed`, e);
    await release();
    return new Response("Handler failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
