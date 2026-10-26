import { drainOutbox } from "@/lib/email/outbox";

// Vercel envía CRON_SECRET como Bearer. Reintenta cancelaciones antes de enviar la cola pendiente.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    return Response.json(await drainOutbox());
  } catch (e) {
    console.error("email cron failed", e);
    return new Response("Failed", { status: 500 });
  }
}
