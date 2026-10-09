import { processCancellationMoney } from "@/lib/payments/cancel-booking";
import { notifyAdminPaymentProblem } from "@/lib/email/admin-emails";
import { defer } from "@/lib/email/booking-emails";
import { cancellationWork } from "@/lib/payments/money";
import { moveToReview, releaseBooking } from "@/lib/payments/release-booking";
import { decideRelease } from "@/lib/payments/release";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel envía CRON_SECRET como Bearer. Es idempotente: repetir o saltarse una ejecución no hace daño.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const { data: due, error } = await admin
    .from("bookings")
    .select("id, keeper_checked_in_at, team_response, auto_release_at")
    .eq("status", "confirmed")
    .eq("payment_status", "held")
    .or(`auto_release_at.lte.${now.toISOString()},team_response.eq.confirmed`);
  if (error) {
    console.error("release cron query failed", error);
    return new Response("Query failed", { status: 500 });
  }

  const summary = { released: 0, movedToReview: 0, skipped: 0, failed: 0, cancellationsResumed: 0, coordinatesPurged: 0 };

  // Cancelaciones cuyo reembolso o pago al portero quedó a medias (p. ej. Stripe falló): se reanudan.
  const { data: cancelled } = await admin
    .from("bookings")
    .select("id, rate_pence, commission_pct, cancellation_charge_pct, payment_status, stripe_transfer_id, released_at")
    .eq("status", "cancelled")
    .in("payment_status", ["held", "partially_refunded"]);
  for (const c of cancelled ?? []) {
    if (c.cancellation_charge_pct === null) continue;
    const work = cancellationWork({
      ratePence: c.rate_pence,
      commissionPct: Number(c.commission_pct),
      chargePct: c.cancellation_charge_pct,
      paymentStatus: c.payment_status,
      transferId: c.stripe_transfer_id,
      releasedAt: c.released_at,
    });
    if (!work.refundPending && !work.payoutPending) continue;
    try {
      await processCancellationMoney(c.id);
      summary.cancellationsResumed++;
    } catch (e) {
      console.error(`cancellation resume failed for booking ${c.id}`, e);
      defer(() => notifyAdminPaymentProblem(c.id, "cancellation", e));
      summary.failed++;
    }
  }

  // Las coordenadas del check-in caducan a los 120 días (Política de privacidad); un fallo aquí no frena las liberaciones.
  const { data: purged, error: purgeError } = await admin.rpc("purge_checkin_coordinates");
  if (purgeError) {
    console.error("purge_checkin_coordinates failed", purgeError);
    summary.failed++;
  } else {
    summary.coordinatesPurged = purged ?? 0;
  }

  for (const b of due ?? []) {
    try {
      const decision = decideRelease({
        checkedIn: Boolean(b.keeper_checked_in_at),
        teamResponse: b.team_response,
        now,
        autoReleaseAt: new Date(b.auto_release_at),
      });
      if (decision === "release") {
        if ((await releaseBooking(b.id)).released) summary.released++;
        else summary.skipped++;
      } else if (decision === "under_review") {
        if (await moveToReview(b.id, "no_checkin_no_response")) summary.movedToReview++;
        else summary.skipped++;
      } else {
        summary.skipped++;
      }
    } catch (e) {
      console.error(`release cron failed for booking ${b.id}`, e);
      defer(() => notifyAdminPaymentProblem(b.id, "release", e));
      summary.failed++;
    }
  }
  return Response.json(summary);
}
