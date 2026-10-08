import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Verifica la firma (sobre el cuerpo sin procesar) y guarda el id del evento antes de procesarlo: un reenvío
 * no se ejecuta dos veces. `release` borra ese id si el procesado falla, para que el reintento de Stripe sí se procese.
 */
export async function receiveStripeEvent(
  req: Request,
  secretName: "STRIPE_WEBHOOK_SECRET" | "STRIPE_CONNECT_WEBHOOK_SECRET",
): Promise<{ event: Stripe.Event; release: () => Promise<void> } | { response: Response }> {
  const secret = process.env[secretName];
  if (!secret) return { response: new Response("Webhook secret is not configured", { status: 500 }) };

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return { response: new Response("Invalid signature", { status: 400 }) };
  }

  const admin = createAdminClient();
  const { error: dup } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dup) {
    if (dup.code === "23505") return { response: new Response("Already processed", { status: 200 }) };
    console.error("stripe_events insert failed", dup);
    return { response: new Response("Could not record event", { status: 500 }) };
  }
  return { event, release: async () => void (await admin.from("stripe_events").delete().eq("id", event.id)) };
}
