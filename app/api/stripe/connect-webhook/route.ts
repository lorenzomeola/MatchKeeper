import { handleConnectEvent } from "@/lib/payments/connect-events";
import { receiveStripeEvent } from "@/lib/payments/webhook";

// Eventos de las cuentas conectadas de los porteros: en Stripe es un destino aparte, con su propio secreto.
export async function POST(req: Request) {
  const received = await receiveStripeEvent(req, "STRIPE_CONNECT_WEBHOOK_SECRET");
  if ("response" in received) return received.response;
  const { event, release } = received;

  try {
    await handleConnectEvent(event);
  } catch (e) {
    console.error(`Stripe connect webhook ${event.type} failed`, e);
    await release();
    return new Response("Handler failed", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}
