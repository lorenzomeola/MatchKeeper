// Plantillas de los emails de marketplace (candidaturas, aprobación, reseñas, chat). Las fechas e importes llegan formateados.
import type { LayoutInput } from "./templates.ts";

export type MarketplaceTemplateData = {
  application_received_team: { keeperName: string; rate: string; pitch: string; when: string; matchUrl: string };
  application_not_selected_keeper: { pitch: string; when: string; browseUrl: string };
  application_closed_keeper: { pitch: string; when: string; browseUrl: string };
  match_reopened_keeper: { pitch: string; when: string; matchUrl: string };
  keeper_approved: { dashboardUrl: string };
  review_received_keeper: { teamName: string; rating: number; comment: string | null; pitch: string; profileUrl: string };
  chat_unread: { senderName: string; pitch: string; chatUrl: string };
  keeper_info_request: { question: string; replyTo: string; profileUrl: string };
};

type Ctx = { siteUrl: string };
type Builder<K extends keyof MarketplaceTemplateData> = (d: MarketplaceTemplateData[K], ctx: Ctx) => LayoutInput;

const stars = (n: number) => `${"★".repeat(n)}${"☆".repeat(Math.max(0, 5 - n))}`;

export const MARKETPLACE_BUILDERS: { [K in keyof MarketplaceTemplateData]: Builder<K> } = {
  application_received_team: (d) => ({
    title: "A keeper wants your match",
    subject: `${d.keeperName} applied for ${d.pitch}`,
    paragraphs: [
      `${d.keeperName} applied to keep goal at ${d.pitch}.`,
      d.when,
      `Their rate is ${d.rate}. Compare keepers, message them and pick the one you like.`,
    ],
    cta: { label: "See the application", url: d.matchUrl },
  }),

  application_not_selected_keeper: (d) => ({
    title: "This one went to another keeper",
    subject: `${d.pitch}: the team picked another keeper`,
    paragraphs: [
      `The team for ${d.pitch} (${d.when}) has booked a different keeper.`,
      "If that booking falls through, your application goes back in the running and we will let you know.",
    ],
    cta: { label: "Find another match", url: d.browseUrl },
  }),

  application_closed_keeper: (d) => ({
    title: "This match is closed",
    subject: `${d.pitch}: the team no longer needs another keeper`,
    paragraphs: [
      `The team for ${d.pitch} (${d.when}) no longer needs another keeper, so your application is closed.`,
    ],
    cta: { label: "Find another match", url: d.browseUrl },
  }),

  match_reopened_keeper: (d) => ({
    title: "The match is open again",
    subject: `Back in the running: ${d.pitch}`,
    paragraphs: [
      `The keeper booked for ${d.pitch} (${d.when}) cancelled, so the match is open again.`,
      "Your application is active again. The team can book you.",
    ],
    cta: { label: "View the match", url: d.matchUrl },
  }),

  keeper_approved: (d) => ({
    title: "You're approved",
    subject: "Your MatchKeeper profile is approved",
    paragraphs: [
      "Your keeper profile has been approved.",
      "Set up payments to receive your fees, then apply to matches near you.",
    ],
    cta: { label: "Go to your dashboard", url: d.dashboardUrl },
  }),

  review_received_keeper: (d) => ({
    title: "You got a new review",
    subject: `${d.teamName} left you a ${d.rating}-star review`,
    paragraphs: [
      `${d.teamName} reviewed you for ${d.pitch}: ${stars(d.rating)}`,
      ...(d.comment ? [`"${d.comment}"`] : []),
    ],
    cta: { label: "See your profile", url: d.profileUrl },
  }),

  chat_unread: (d) => ({
    title: "You have a new message",
    subject: `New message from ${d.senderName}`,
    paragraphs: [`${d.senderName} sent you a message about ${d.pitch}.`],
    cta: { label: "Read the message", url: d.chatUrl },
    note: "We only email you about messages you haven't opened.",
  }),

  keeper_info_request: (d) => ({
    title: "A question about your profile",
    subject: "A quick question about your MatchKeeper profile",
    paragraphs: [
      "Before we approve your keeper profile, our team has a question:",
      ...d.question
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean),
      "Just reply to this email with your answer.",
    ],
    cta: { label: "Open your profile", url: d.profileUrl },
    note: "Your reply goes straight to the MatchKeeper team.",
    replyTo: d.replyTo,
  }),
};
