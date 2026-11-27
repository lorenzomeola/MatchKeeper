// Plantillas de los emails de marketplace (candidaturas, aprobación, reseñas, chat). Las fechas e importes llegan formateados.
import type { LayoutInput } from "./templates.ts";
import type { UpdateKind } from "../match-changes.ts";

export type MarketplaceTemplateData = {
  application_received_team: { keeperName: string; rate: string; pitch: string; when: string; matchUrl: string };
  application_not_selected_keeper: { pitch: string; when: string; browseUrl: string };
  application_closed_keeper: { pitch: string; when: string; browseUrl: string };
  match_reopened_keeper: { pitch: string; when: string; matchUrl: string };
  keeper_approved: { dashboardUrl: string; payments?: boolean | null };
  review_received_keeper: { teamName: string; rating: number; comment: string | null; pitch: string; profileUrl: string };
  chat_unread: { senderName: string; pitch: string; chatUrl: string };
  keeper_info_request: { question: string; replyTo: string; profileUrl: string };
  support_unread: { chatUrl: string };
  match_digest_keeper: { count: number; matches: string[]; browseUrl: string; profileUrl: string };
  match_updated_applicant: { pitch: string; when: string; kind: UpdateKind; changes: string[]; matchUrl: string };
  match_cancelled_applicant: { pitch: string; when: string; browseUrl: string };
  match_updated_keeper: { pitch: string; when: string; kind: UpdateKind; changes: string[]; matchUrl: string; profileUrl: string };
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
      d.payments === false
        ? "You can now apply to matches near you."
        : d.payments === true
          ? "Set up payments to receive your fees, then apply to matches near you."
          : "We could not confirm the current booking settings. Please try again shortly before applying to a match.",
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
      {
        label: "Message from the MatchKeeper team",
        quote: d.question
          .split(/\n+/)
          .map((p) => p.trim())
          .filter(Boolean),
      },
      "Just reply to this email with your answer.",
    ],
    cta: { label: "Open your profile", url: d.profileUrl },
    note: "Your reply goes straight to the MatchKeeper team.",
    replyTo: d.replyTo,
  }),

  support_unread: (d) => ({
    title: "A message from MatchKeeper",
    subject: "The MatchKeeper team sent you a message",
    paragraphs: ["The MatchKeeper team sent you a message in the app. You can read it and reply there."],
    cta: { label: "Read the message", url: d.chatUrl },
    note: "We only email you about messages you haven't opened.",
  }),

  match_digest_keeper: (d) => {
    const more = d.count - d.matches.length;
    return {
      title: "Matches looking for a keeper",
      subject: d.count === 1 ? "1 open match is looking for a keeper" : `${d.count} open matches are looking for a keeper`,
      paragraphs: [
        d.count === 1 ? "This match still needs a keeper:" : "These matches still need a keeper:",
        { quote: d.matches },
        ...(more > 0 ? [`And ${more} more on the map.`] : []),
      ],
      cta: { label: "See open matches", url: d.browseUrl },
      note: `You get this email on Wednesdays when there are matches you haven't applied to. You can turn it off in your profile: ${d.profileUrl}`,
    };
  },

  match_updated_applicant: (d) => ({
    title: d.kind === "budget_up" ? "The budget went up" : d.kind === "budget" ? "The budget changed" : "A match you applied to changed",
    subject:
      d.kind === "budget_up"
        ? `${d.pitch}: the budget went up`
        : d.kind === "budget"
          ? `${d.pitch}: the budget changed`
          : `${d.pitch}: the match details changed`,
    paragraphs: [
      `The team changed the match you applied to at ${d.pitch} (${d.when}).`,
      { label: "What changed", quote: d.changes },
      d.kind === "details"
        ? "Your application is still active. If the new details don't work for you, you can withdraw it from the match page."
        : "Your application is still active, and you can keep your rate or withdraw from the match page.",
    ],
    cta: { label: "View the match", url: d.matchUrl },
  }),

  match_cancelled_applicant: (d) => ({
    title: "This match was cancelled",
    subject: `${d.pitch}: the match was cancelled`,
    paragraphs: [
      `The team cancelled the match at ${d.pitch} (${d.when}), so your application is closed.`,
      "Other teams are still looking for a keeper.",
    ],
    cta: { label: "Find another match", url: d.browseUrl },
  }),

  match_updated_keeper: (d) => ({
    title: d.kind === "budget_up" ? "A match raised its budget" : "A match was updated",
    subject: d.kind === "budget_up" ? `Budget raised: ${d.pitch} still needs a keeper` : `Updated: ${d.pitch} still needs a keeper`,
    paragraphs: [
      `${d.pitch} (${d.when}) was updated and still needs a keeper.`,
      { label: "What changed", quote: d.changes },
      "If it suits you now, you can apply with your own rate.",
    ],
    cta: { label: "View the match", url: d.matchUrl },
    note: `You get this because you're an approved keeper. You can turn match emails off in your profile: ${d.profileUrl}`,
  }),
};
