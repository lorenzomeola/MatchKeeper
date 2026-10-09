import "server-only";
import { after } from "next/server";
import { moneyPence, shortDate } from "@/lib/format";
import { appUrl } from "@/lib/payments/app-url";
import { keeperStanding } from "@/lib/strikes";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBookingContext, type BookingCtx } from "./booking-context";
import { cancelEmails, queueEmail } from "./outbox";
import { notifyAdminBookingReview, notifyAdminKeeperStanding } from "./admin-emails";
import { notifyNotSelected, notifyReopened } from "./marketplace-emails";
import { bookingSchedule } from "./schedule";

const key = (bookingId: string, name: string) => `booking:${bookingId}:${name}`;

/** Corre el envío después de responder al usuario; fuera de una petición (scripts) lo ejecuta ya. Nunca lanza. */
export function defer(task: () => Promise<void>) {
  const safe = async () => {
    try {
      await task();
    } catch (e) {
      console.error("email task failed", e);
    }
  };
  try {
    after(safe);
  } catch {
    void safe();
  }
}

async function cancelPending(prefix: string) {
  try {
    await cancelEmails(prefix);
  } catch (e) {
    console.error(`cancelEmails failed for ${prefix}`, e);
  }
}

/** Pago confirmado: aviso a las dos partes y programación de recordatorios y avisos posteriores. */
export async function notifyBookingConfirmed(bookingId: string) {
  const c = await loadBookingContext(bookingId);
  if (!c || c.status === "cancelled" || c.status === "pending_payment") return;

  if (c.team.email) {
    await queueEmail({
      template: "booking_confirmed_team",
      toEmail: c.team.email,
      toUserId: c.team.id,
      dedupe: key(c.id, "booking_confirmed_team"),
      data: {
        keeperName: c.keeper.name,
        pitch: c.pitch,
        when: c.when,
        total: moneyPence(c.totalPence),
        rate: moneyPence(c.ratePence),
        fee: moneyPence(c.feePence),
        matchUrl: c.matchUrl,
      },
    });
  }
  if (c.keeper.email) {
    await queueEmail({
      template: "booking_confirmed_keeper",
      toEmail: c.keeper.email,
      toUserId: c.keeper.id,
      dedupe: key(c.id, "booking_confirmed_keeper"),
      data: { teamName: c.team.name, pitch: c.pitch, when: c.when, rate: moneyPence(c.ratePence), matchUrl: c.matchUrl },
    });
  }

  for (const item of bookingSchedule({ startsAt: c.startsAt, endsAt: c.endsAt, autoReleaseAt: c.autoReleaseAt }, new Date())) {
    await queueScheduled(c, item.template, item.sendAfter);
  }
  await notifyNotSelected(c);
}

async function queueScheduled(c: BookingCtx, template: ReturnType<typeof bookingSchedule>[number]["template"], sendAfter: Date) {
  const dedupe = key(c.id, template);
  switch (template) {
    case "keeper_checkin_24h":
      if (c.keeper.email)
        await queueEmail({ template, toEmail: c.keeper.email, toUserId: c.keeper.id, dedupe, sendAfter, data: { teamName: c.team.name, pitch: c.pitch, when: c.when, matchUrl: c.matchUrl } });
      return;
    case "keeper_checkin_30m":
      if (c.keeper.email)
        await queueEmail({ template, toEmail: c.keeper.email, toUserId: c.keeper.id, dedupe, sendAfter, data: { pitch: c.pitch, when: c.when, matchUrl: c.matchUrl } });
      return;
    case "team_played_prompt":
    case "team_played_reminder":
      if (c.team.email)
        await queueEmail({ template, toEmail: c.team.email, toUserId: c.team.id, dedupe, sendAfter, data: { keeperName: c.keeper.name, pitch: c.pitch, matchUrl: c.matchUrl } });
      return;
    case "team_autorelease_notice":
      if (c.team.email && c.autoReleaseAt)
        await queueEmail({
          template,
          toEmail: c.team.email,
          toUserId: c.team.id,
          dedupe,
          sendAfter,
          data: { keeperName: c.keeper.name, pitch: c.pitch, releaseOn: shortDate(c.autoReleaseAt.toISOString()), matchUrl: c.matchUrl },
        });
      return;
  }
}

/** El portero ya hizo el check-in: los recordatorios de check-in que quedaban sobran. */
export async function notifyCheckedIn(bookingId: string) {
  await cancelPending(key(bookingId, "keeper_checkin_"));
}

/** El equipo ya respondió (confirmó o reportó): los avisos de "¿jugó?" y de liberación sobran. */
export async function notifyTeamResponded(bookingId: string) {
  await cancelPending(key(bookingId, "team_"));
}

type CancelInput = {
  by: "team" | "keeper" | "admin" | "system";
  refundPence: number;
  keeperSharePence: number;
  strikeKind: "late_cancel" | "no_show" | null;
  /** El partido vuelve a abrirse a otros candidatos. */
  reopened: boolean;
};

/** Reserva cancelada: se anulan los avisos programados y se avisa a las dos partes (y al portero de su strike). */
export async function notifyBookingCancelled(bookingId: string, input: CancelInput) {
  await cancelPending(key(bookingId, ""));
  const c = await loadBookingContext(bookingId);
  if (!c) return;
  const by = input.by === "admin" ? "system" : input.by;

  if (c.team.email) {
    await queueEmail({
      template: "booking_cancelled_team",
      toEmail: c.team.email,
      toUserId: c.team.id,
      dedupe: key(c.id, "cancelled_team"),
      data: {
        by,
        keeperName: c.keeper.name,
        pitch: c.pitch,
        when: c.when,
        refund: input.refundPence > 0 ? moneyPence(input.refundPence) : null,
        keeperGets: input.keeperSharePence > 0 ? moneyPence(input.keeperSharePence) : null,
        matchUrl: c.matchUrl,
      },
    });
  }
  if (c.keeper.email) {
    await queueEmail({
      template: "booking_cancelled_keeper",
      toEmail: c.keeper.email,
      toUserId: c.keeper.id,
      dedupe: key(c.id, "cancelled_keeper"),
      data: {
        by,
        teamName: c.team.name,
        pitch: c.pitch,
        when: c.when,
        share: input.keeperSharePence > 0 ? moneyPence(input.keeperSharePence) : null,
        matchUrl: c.matchUrl,
      },
    });
    if (input.strikeKind) {
      const { data: strikes } = await createAdminClient()
        .from("strikes")
        .select("kind, created_at, waived_at")
        .eq("goalkeeper_id", c.keeper.id);
      const standing = keeperStanding(
        (strikes ?? []).map((s) => ({ kind: s.kind, createdAt: new Date(s.created_at), waivedAt: s.waived_at ? new Date(s.waived_at) : null })),
        new Date(),
      );
      await queueEmail({
        template: "keeper_strike",
        toEmail: c.keeper.email,
        toUserId: c.keeper.id,
        dedupe: key(c.id, "strike"),
        data: { kind: input.strikeKind, level: standing.level, pitch: c.pitch, matchUrl: c.matchUrl },
      });
      await notifyAdminKeeperStanding(c, standing);
    }
  }
  if (input.reopened) await notifyReopened(c);
}

/** Pago liberado al portero: aviso con lo que recibe, y los avisos al equipo que quedaban ya sobran. */
export async function notifyReleased(bookingId: string, input: { amountPence: number; debtPence: number }) {
  await cancelPending(key(bookingId, "team_"));
  const c = await loadBookingContext(bookingId);
  if (!c?.keeper.email) return;
  await queueEmail({
    template: "payment_released_keeper",
    toEmail: c.keeper.email,
    toUserId: c.keeper.id,
    dedupe: key(c.id, "released_keeper"),
    data: {
      teamName: c.team.name,
      pitch: c.pitch,
      amount: moneyPence(input.amountPence),
      debt: input.debtPence > 0 ? moneyPence(input.debtPence) : null,
      paymentsUrl: c.paymentsUrl,
    },
  });
}

/** La reserva pasa a revisión de un admin. */
export async function notifyBookingInReview(bookingId: string, reason: string) {
  await cancelPending(key(bookingId, "team_"));
  const c = await loadBookingContext(bookingId);
  if (!c) return;
  if (c.team.email) {
    await queueEmail({
      template: "booking_review_team",
      toEmail: c.team.email,
      toUserId: c.team.id,
      dedupe: key(c.id, "review_team"),
      data: { keeperName: c.keeper.name, pitch: c.pitch, when: c.when, matchUrl: c.matchUrl },
    });
  }
  if (c.keeper.email) {
    await queueEmail({
      template: "booking_review_keeper",
      toEmail: c.keeper.email,
      toUserId: c.keeper.id,
      dedupe: key(c.id, "review_keeper"),
      data: { teamName: c.team.name, pitch: c.pitch, when: c.when, matchUrl: c.matchUrl },
    });
  }
  await notifyAdminBookingReview(c, reason);
}

/** Stripe no pudo pagar al banco del portero. `eventAt` distingue un fallo nuevo de uno ya avisado. */
export async function notifyPayoutFailed(keeperId: string, message: string | null, eventAt: Date) {
  const { data } = await createAdminClient().auth.admin.getUserById(keeperId);
  const email = data?.user?.email;
  if (!email) return;
  await queueEmail({
    template: "payout_failed_keeper",
    toEmail: email,
    toUserId: keeperId,
    dedupe: `payout_failed:${keeperId}:${eventAt.getTime()}`,
    data: { message, paymentsUrl: `${appUrl()}/payments` },
  });
}

/** El pago no se completó y la sesión caducó. Hay que llamarlo antes de borrar la reserva pendiente. */
export async function notifyCheckoutExpired(bookingId: string) {
  const c = await loadBookingContext(bookingId);
  if (!c?.team.email) return;
  await queueEmail({
    template: "checkout_expired_team",
    toEmail: c.team.email,
    toUserId: c.team.id,
    dedupe: `checkout_expired:${bookingId}`,
    data: { keeperName: c.keeper.name, pitch: c.pitch, matchUrl: c.matchUrl },
  });
}
