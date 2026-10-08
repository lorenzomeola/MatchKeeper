// Plantillas de los emails de reservas y pagos. Los importes y fechas llegan ya formateados.
import type { LayoutInput } from "./templates.ts";

export type BookingTemplateData = {
  booking_confirmed_team: { keeperName: string; pitch: string; when: string; total: string; rate: string; fee: string; matchUrl: string };
  booking_confirmed_keeper: { teamName: string; pitch: string; when: string; rate: string; matchUrl: string };
  keeper_checkin_24h: { teamName: string; pitch: string; when: string; matchUrl: string };
  keeper_checkin_30m: { pitch: string; when: string; matchUrl: string };
  team_played_prompt: { keeperName: string; pitch: string; matchUrl: string };
  team_played_reminder: { keeperName: string; pitch: string; matchUrl: string };
  team_autorelease_notice: { keeperName: string; pitch: string; releaseOn: string; matchUrl: string };
  payment_released_keeper: { teamName: string; pitch: string; amount: string; debt: string | null; paymentsUrl: string };
  booking_cancelled_team: {
    by: "team" | "keeper" | "system";
    keeperName: string;
    pitch: string;
    when: string;
    /** Lo que se devuelve al equipo; null si nada. */
    refund: string | null;
    /** Lo que se queda el portero por una cancelación tardía; null si nada. */
    keeperGets: string | null;
    matchUrl: string;
  };
  booking_cancelled_keeper: {
    by: "team" | "keeper" | "system";
    teamName: string;
    pitch: string;
    when: string;
    /** Lo que cobra el portero; null si nada. */
    share: string | null;
    matchUrl: string;
  };
  keeper_strike: { kind: "late_cancel" | "no_show"; level: "good" | "warned" | "review" | "suspended"; pitch: string; matchUrl: string };
  booking_review_team: { keeperName: string; pitch: string; when: string; matchUrl: string };
  booking_review_keeper: { teamName: string; pitch: string; when: string; matchUrl: string };
  payout_failed_keeper: { message: string | null; paymentsUrl: string };
  checkout_expired_team: { keeperName: string; pitch: string; matchUrl: string };
};

type Ctx = { siteUrl: string };
type Builder<K extends keyof BookingTemplateData> = (d: BookingTemplateData[K], ctx: Ctx) => LayoutInput;

export const BOOKING_BUILDERS: { [K in keyof BookingTemplateData]: Builder<K> } = {
  booking_confirmed_team: (d) => ({
    title: "Your keeper is booked",
    subject: `Keeper booked for ${d.pitch}`,
    paragraphs: [
      `${d.keeperName} will keep goal for you at ${d.pitch}.`,
      d.when,
      `You paid ${d.total} (${d.rate} keeper rate plus ${d.fee} service fee). The money is held and only goes to the keeper after the match is played.`,
    ],
    cta: { label: "View the match", url: d.matchUrl },
    note: "Cancelling more than 24 hours before kick-off is free. After that, part or all of the payment goes to the keeper.",
  }),

  booking_confirmed_keeper: (d) => ({
    title: "You're booked",
    subject: `You're booked: ${d.pitch}`,
    paragraphs: [
      `${d.teamName} booked you for ${d.when} at ${d.pitch}.`,
      `Your rate is ${d.rate}. You get paid after the match.`,
      "When you reach the pitch, check in from the match page, from 30 minutes before kick-off. That is how we know you turned up.",
    ],
    cta: { label: "Open the match", url: d.matchUrl },
  }),

  keeper_checkin_24h: (d) => ({
    title: "Your match is tomorrow",
    subject: `Reminder: you keep goal tomorrow at ${d.pitch}`,
    paragraphs: [
      `You are booked for ${d.teamName}: ${d.when} at ${d.pitch}.`,
      "You can check in from 30 minutes before kick-off, when you get to the pitch.",
    ],
    cta: { label: "Open the match", url: d.matchUrl },
  }),

  keeper_checkin_30m: (d) => ({
    title: "Check in now",
    subject: `Check-in is open: ${d.pitch}`,
    paragraphs: [
      `Check-in is open for your match at ${d.pitch} (${d.when}).`,
      "Tap the button when you get to the pitch. We use your location once.",
    ],
    cta: { label: "Check in", url: d.matchUrl },
  }),

  team_played_prompt: (d) => ({
    title: `Did ${d.keeperName} play?`,
    subject: `Did ${d.keeperName} play at ${d.pitch}?`,
    paragraphs: [
      `Your match at ${d.pitch} has finished.`,
      "Confirm it was played to release the payment, or tell us if something went wrong.",
      "If you do nothing, the payment is released to the keeper automatically three days after the match.",
    ],
    cta: { label: "Answer now", url: d.matchUrl },
  }),

  team_played_reminder: (d) => ({
    title: "We still need your answer",
    subject: `Reminder: confirm your match at ${d.pitch}`,
    paragraphs: [
      `We have not heard from you about the match with ${d.keeperName} at ${d.pitch}.`,
      "Confirm it was played, or report a problem. Otherwise the payment is released to the keeper automatically three days after the match.",
    ],
    cta: { label: "Answer now", url: d.matchUrl },
  }),

  team_autorelease_notice: (d) => ({
    title: "The payment will be released soon",
    subject: `Payment for ${d.pitch} is released on ${d.releaseOn}`,
    paragraphs: [
      `The payment for ${d.keeperName} at ${d.pitch} will be released to the keeper automatically on ${d.releaseOn}.`,
      "If something went wrong, report it before then.",
    ],
    cta: { label: "Review the match", url: d.matchUrl },
  }),

  payment_released_keeper: (d) => ({
    title: `You've been paid ${d.amount}`,
    subject: `Payment sent: ${d.amount} for ${d.pitch}`,
    paragraphs: [
      `${d.amount} for the match at ${d.pitch} (${d.teamName}) was sent to your Stripe account.`,
      ...(d.debt ? [`${d.debt} was taken from this payment to repay a disputed payment.`] : []),
      "Stripe pays it to your bank on its normal schedule.",
    ],
    cta: { label: "See your payments", url: d.paymentsUrl },
  }),

  booking_cancelled_team: (d) => {
    const intro =
      d.by === "team"
        ? `You cancelled the booking with ${d.keeperName} for ${d.when} at ${d.pitch}.`
        : d.by === "keeper"
          ? `${d.keeperName} cancelled the booking for ${d.when} at ${d.pitch}.`
          : `MatchKeeper cancelled the booking with ${d.keeperName} for ${d.when} at ${d.pitch} after a report.`;
    return {
      title: "Booking cancelled",
      subject: `Booking cancelled: ${d.pitch}`,
      paragraphs: [
        intro,
        d.refund
          ? `You are refunded ${d.refund}. A refund to a card can take several days to show on your statement.`
          : "No refund applies, because it was too close to kick-off.",
        ...(d.keeperGets ? [`The keeper receives ${d.keeperGets}.`] : []),
        ...(d.by === "keeper" ? ["If the match is still open, other keepers can apply again."] : []),
      ],
      cta: { label: "View the match", url: d.matchUrl },
    };
  },

  booking_cancelled_keeper: (d) => {
    const intro =
      d.by === "team"
        ? `${d.teamName} cancelled the booking for ${d.when} at ${d.pitch}.`
        : d.by === "keeper"
          ? `You cancelled the booking for ${d.when} at ${d.pitch}.`
          : `MatchKeeper cancelled the booking for ${d.when} at ${d.pitch} after a report.`;
    return {
      title: "Booking cancelled",
      subject: `Booking cancelled: ${d.pitch}`,
      paragraphs: [
        intro,
        d.share ? `You are paid ${d.share} for the late cancellation.` : "No payment is due.",
      ],
      cta: { label: "View the match", url: d.matchUrl },
    };
  },

  keeper_strike: (d) => {
    const reason =
      d.kind === "no_show"
        ? `A strike was added to your profile for the match at ${d.pitch}, because you did not show up.`
        : `A strike was added to your profile for cancelling the match at ${d.pitch} less than 24 hours before kick-off.`;
    const standing =
      d.level === "suspended"
        ? "Your account is suspended: you cannot apply to new matches. Write to us if you think this is a mistake."
        : d.level === "review"
          ? "Your profile will be reviewed by an admin."
          : "Late cancellations expire after 90 days and no-shows after 12 months. At 3 points your account is suspended.";
    return {
      title: "A strike was added to your profile",
      subject: d.level === "suspended" ? "Your MatchKeeper account is suspended" : "A strike was added to your profile",
      paragraphs: [reason, standing],
      cta: { label: "Open the match", url: d.matchUrl },
    };
  },

  booking_review_team: (d) => ({
    title: "Your booking is under review",
    subject: `Under review: ${d.pitch}`,
    paragraphs: [
      `We are reviewing the match with ${d.keeperName} at ${d.pitch} (${d.when}).`,
      "The payment stays on hold until we decide. We will write to you when it is resolved.",
    ],
    cta: { label: "View the match", url: d.matchUrl },
  }),

  booking_review_keeper: (d) => ({
    title: "Your booking is under review",
    subject: `Under review: ${d.pitch}`,
    paragraphs: [
      `We are reviewing the match for ${d.teamName} at ${d.pitch} (${d.when}).`,
      "The payment stays on hold until we decide. We will write to you when it is resolved.",
    ],
    cta: { label: "View the match", url: d.matchUrl },
  }),

  payout_failed_keeper: (d) => ({
    title: "Stripe could not pay out to your bank",
    subject: "Action needed: your payout failed",
    paragraphs: [
      "Stripe tried to send a payout to your bank and it failed.",
      ...(d.message ? [`Stripe says: ${d.message}`] : []),
      "Your money is safe in your Stripe balance. Update your bank details in your Stripe dashboard so payouts can continue.",
    ],
    cta: { label: "Open your payments", url: d.paymentsUrl },
  }),

  checkout_expired_team: (d) => ({
    title: "Your booking was not completed",
    subject: `Booking not completed: ${d.pitch}`,
    paragraphs: [
      `You started booking ${d.keeperName} for the match at ${d.pitch}, but the payment was not completed.`,
      "Nothing was charged. The keeper's application may still be open, so you can book again.",
    ],
    cta: { label: "Back to the match", url: d.matchUrl },
  }),
};
