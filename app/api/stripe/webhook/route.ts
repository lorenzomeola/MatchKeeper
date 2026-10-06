import type Stripe from "stripe";
import { confirmCheckoutSession, discardExpiredCheckout } from "@/lib/payments/checkout";
import { handleDisputeEvent } from "@/lib/payments/dispute-handlers";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// El cuerpo se lee sin procesar: la firma de Stripe se calcula sobre los bytes exactos.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook secret is not configured", { status: 500 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Se guarda el id antes de procesar: un reenvío del mismo evento no se ejecuta dos veces.
  const admin = createAdminClient();
  const { error: dup } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dup) {
    if (dup.code === "23505") return new Response("Already processed", { status: 200 });
    console.error("stripe_events insert failed", dup);
    return new Response("Could not record event", { status: 500 });
  }

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
      default:
        break;
    }
  } catch (e) {
    console.error(`Stripe webhook ${event.type} failed`, e);
    // Se libera el id para que el reintento de Stripe sí se procese.
    await admin.from("stripe_events").delete().eq("id", event.id);
    return new Response("Handler failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
