import { sendMatchDigest } from "@/lib/email/digest";

// Vercel envía CRON_SECRET como Bearer. Los miércoles; repetirlo el mismo día no duplica emails.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    return Response.json(await sendMatchDigest());
  } catch (e) {
    console.error("digest cron failed", e);
    return new Response("Failed", { status: 500 });
  }
}
