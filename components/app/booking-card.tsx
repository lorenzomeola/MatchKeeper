import { CancelBookingButton, CheckInButton, TeamResponseActions } from "@/components/app/booking-actions";
import { StatusBadge } from "@/components/app/status-badge";
import { moneyPence } from "@/lib/format";
import { CHECKIN_WINDOW_MIN } from "@/lib/payments/config";
import { teamCanRespond } from "@/lib/payments/checkin";
import { cancellationPlan, hoursBeforeStart, partialCharge } from "@/lib/payments/money";

export type BookingForCard = {
  id: string;
  status: string;
  keeper_checked_in_at: string | null;
  team_response: string | null;
  auto_release_at: string | null;
  cancelled_by: string | null;
  cancellation_charge_pct: number | null;
  rate_pence: number | null;
  commission_pct: string | number;
};

const londonTime = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

/** Qué pasaría ahora si esta parte cancelara. El servidor lo vuelve a calcular al confirmar. */
function cancelConsequence(role: "owner" | "keeper", booking: BookingForCard, start: Date, now: Date) {
  const rate = booking.rate_pence ?? 0;
  const commission = Number(booking.commission_pct);
  const plan = cancellationPlan(rate, commission, role === "owner" ? "team" : "keeper", hoursBeforeStart(start, now));
  if (role === "owner") {
    if (plan.chargePct === 0) return `You get ${moneyPence(plan.refundPence)} back, everything you paid.`;
    if (plan.chargePct === 50) {
      return `You get ${moneyPence(plan.refundPence)} back. The keeper receives ${moneyPence(plan.keeperSharePence)}, because it is less than 24 hours to kick-off.`;
    }
    return "There is no refund, because it is less than 2 hours to kick-off. The keeper is paid in full.";
  }
  return [
    "The team is refunded in full.",
    plan.strike ? "A strike is added to your profile, because it is less than 24 hours to kick-off." : "There is no penalty.",
    plan.matchAfter === "open" ? "The match opens again for other keepers." : "The match is cancelled.",
  ].join(" ");
}

/** Estado del pago y acciones de la reserva, para el equipo (owner) o el portero. */
export function BookingCard({
  role,
  booking,
  startsAt,
  endsAt,
}: {
  role: "owner" | "keeper";
  booking: BookingForCard;
  startsAt: string;
  endsAt: string;
}) {
  const now = new Date();
  const start = new Date(startsAt);
  const checkedIn = Boolean(booking.keeper_checked_in_at);
  const shell = "pl-surface mt-8 grid gap-4 rounded-[var(--r-xl)] p-5 sm:p-6";
  // El equipo puede cancelar hasta el final del partido; el portero, hasta el inicio.
  const canCancel = booking.status === "confirmed" && (role === "owner" ? now < new Date(endsAt) : now < start);
  const cancelButton = canCancel ? (
    <div>
      <CancelBookingButton bookingId={booking.id} consequence={cancelConsequence(role, booking, start, now)} />
    </div>
  ) : null;

  if (booking.status === "cancelled") {
    const split = partialCharge(booking.rate_pence ?? 0, Number(booking.commission_pct), booking.cancellation_charge_pct ?? 0);
    const byTeam = booking.cancelled_by === "team";
    const byKeeper = booking.cancelled_by === "keeper";
    let text: string;
    if (role === "owner") {
      if (byTeam) {
        text =
          split.refundPence > 0
            ? `You cancelled this booking. You were refunded ${moneyPence(split.refundPence)}${split.keeperSharePence > 0 ? ` and the keeper received ${moneyPence(split.keeperSharePence)}` : ""}.`
            : "You cancelled this booking. No refund applies because it was too close to kick-off.";
      } else if (byKeeper) {
        text = "The keeper cancelled. You were refunded in full. If the match is still open, other keepers can apply again.";
      } else {
        text = "This booking was cancelled and you were refunded in full.";
      }
    } else if (byTeam) {
      text =
        split.keeperSharePence > 0
          ? `The team cancelled. You are paid ${moneyPence(split.keeperSharePence)}.`
          : "The team cancelled. No payment is due.";
    } else if (byKeeper) {
      text = "You cancelled this booking.";
    } else {
      text = "This booking was cancelled by MatchKeeper after a report.";
    }
    return (
      <section className={shell}>
        <StatusBadge tone="neutral">Cancelled</StatusBadge>
        <p className="pl-prose text-[15px]">{text}</p>
      </section>
    );
  }

  if (booking.status === "completed") {
    return (
      <section className={shell}>
        <StatusBadge tone="success">{role === "keeper" ? "Paid" : "Payment released"}</StatusBadge>
        <p className="pl-prose text-[15px]">
          {role === "keeper"
            ? "Your rate was sent to your Stripe account. Stripe pays it to your bank on its normal schedule."
            : "The keeper has been paid. Thanks for playing."}
        </p>
      </section>
    );
  }

  if (booking.status === "under_review") {
    return (
      <section className={shell}>
        <StatusBadge tone="warning">Under review</StatusBadge>
        <p className="pl-prose text-[15px]">
          The payment is on hold while we look at this match. We will contact you both.
        </p>
      </section>
    );
  }

  if (booking.status !== "confirmed") return null;

  if (role === "keeper") {
    const opensAt = new Date(start.getTime() - CHECKIN_WINDOW_MIN * 60_000);
    const closesAt = new Date(start.getTime() + CHECKIN_WINDOW_MIN * 60_000);
    return (
      <section className={shell}>
        <StatusBadge tone={checkedIn ? "success" : "accent"}>{checkedIn ? "Checked in" : "Booked"}</StatusBadge>
        {checkedIn ? (
          <p className="pl-prose text-[15px]">
            You checked in at {londonTime(new Date(booking.keeper_checked_in_at!))}. You are paid after the team confirms
            or within three days.
          </p>
        ) : now < opensAt ? (
          <p className="pl-prose text-[15px]">
            The payment is held. Check-in opens at {londonTime(opensAt)}, when you are at the pitch.
          </p>
        ) : now <= closesAt ? (
          <>
            <p className="pl-prose text-[15px]">Tap the button when you get to the pitch. We use your location once.</p>
            <div>
              <CheckInButton bookingId={booking.id} />
            </div>
          </>
        ) : (
          <p className="pl-prose text-[15px]">
            The check-in window is closed. If you played, the team can still confirm it and you get paid.
          </p>
        )}
        {cancelButton}
      </section>
    );
  }

  const canRespond =
    !booking.team_response && booking.auto_release_at && teamCanRespond(now, start, new Date(booking.auto_release_at));
  return (
    <section className={shell}>
      <StatusBadge tone="accent">Booked</StatusBadge>
      {booking.team_response ? (
        <p className="pl-prose text-[15px]">Thanks, we have your answer.</p>
      ) : canRespond ? (
        <>
          <p className="pl-prose text-[15px]">
            {checkedIn ? "The keeper checked in at the pitch. " : "The keeper has not checked in. "}
            Did they play? If you do nothing, the payment is released automatically three days after the match
            {checkedIn ? "" : " only if the keeper checked in; otherwise we review it"}.
          </p>
          <TeamResponseActions bookingId={booking.id} />
        </>
      ) : (
        <p className="pl-prose text-[15px]">
          Your payment is held until the match is played. After kick-off you can confirm it or report a problem here.
        </p>
      )}
      {cancelButton}
    </section>
  );
}
