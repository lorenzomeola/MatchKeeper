import Stripe from "stripe";

let client: Stripe | null = null;

// Solo servidor: la secret key nunca debe llegar al bundle del cliente.
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key, { maxNetworkRetries: 2 });
  }
  return client;
}
