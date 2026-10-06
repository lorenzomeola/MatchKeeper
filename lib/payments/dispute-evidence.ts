import { CANCELLATION_POLICY_TEXT } from "./config.ts";

// Evidencia de una disputa a partir de los datos de la reserva. Función pura: la lectura de datos está en dispute-evidence-data.ts.

export type EvidenceInput = {
  bookingId: string;
  matchAddress: string | null;
  startsAt: Date;
  endsAt: Date;
  playerName: string;
  playerEmail: string | null;
  keeperName: string;
  keeperExperienceYears: number | null;
  ratePence: number;
  totalPence: number;
  termsVersion: string | null;
  termsAcceptedAt: Date | null;
  paidAt: Date | null;
  checkedInAt: Date | null;
  checkInDistanceM: number | null;
  teamResponse: string | null;
  teamRespondedAt: Date | null;
  teamReportNote: string | null;
  chat: { at: Date; from: "team" | "keeper"; body: string }[];
  events: { at: Date; type: string }[];
};

/** Stripe limita cada campo de texto a 20.000 caracteres. */
export const FIELD_MAX = 19_000;

export type StripeEvidence = {
  product_description: string;
  customer_name: string;
  customer_email_address?: string;
  service_date: string;
  cancellation_policy_disclosure: string;
  access_activity_log: string;
  uncategorized_text: string;
};

export type EvidencePackage = {
  stripe: StripeEvidence;
  checks: { label: string; ok: boolean }[];
};

const gbp = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const cut = (s: string) => (s.length <= FIELD_MAX ? s : `${s.slice(0, FIELD_MAX - 20)}\n[truncated]`);
const iso = (d: Date) => d.toISOString();

const RESPONSE_LABEL: Record<string, string> = {
  confirmed: "The team confirmed the goalkeeper played",
  reported_no_show: "The team reported that the goalkeeper did not show up",
  reported_other: "The team reported a problem",
};

/** Cada punto es una prueba que el banco valora. Con pocas pruebas conviene no responder: perder cuesta otras 20 libras. */
export function evidenceChecks(i: EvidenceInput) {
  return [
    { label: "The team accepted the Terms and the cancellation policy", ok: Boolean(i.termsAcceptedAt) },
    { label: "The keeper checked in at the pitch", ok: Boolean(i.checkedInAt) },
    { label: "The team confirmed the match was played", ok: i.teamResponse === "confirmed" },
    { label: "There are chat messages between both sides", ok: i.chat.length > 0 },
  ];
}

export function formatEvidence(i: EvidenceInput): EvidencePackage {
  const where = i.matchAddress ?? "the agreed pitch";
  const experience = i.keeperExperienceYears ? ` The goalkeeper has ${i.keeperExperienceYears} years of experience.` : "";

  const timeline: string[] = [];
  if (i.termsAcceptedAt) timeline.push(`${iso(i.termsAcceptedAt)}  Team accepted the Terms (version ${i.termsVersion ?? "unknown"}) and the cancellation policy`);
  if (i.paidAt) timeline.push(`${iso(i.paidAt)}  Payment confirmed with 3D Secure authentication`);
  timeline.push(`${iso(i.startsAt)}  Match start`);
  if (i.checkedInAt) {
    const dist = i.checkInDistanceM === null ? "" : ` (${i.checkInDistanceM} m from the pitch)`;
    timeline.push(`${iso(i.checkedInAt)}  Goalkeeper checked in with the phone's location${dist}`);
  }
  timeline.push(`${iso(i.endsAt)}  Match end`);
  if (i.teamResponse && i.teamRespondedAt) timeline.push(`${iso(i.teamRespondedAt)}  ${RESPONSE_LABEL[i.teamResponse] ?? i.teamResponse}`);
  for (const e of i.events) timeline.push(`${iso(e.at)}  [system] ${e.type}`);
  timeline.sort();

  const chat = i.chat.length
    ? i.chat.map((m) => `${iso(m.at)}  ${m.from === "team" ? "Team" : "Goalkeeper"}: ${m.body}`).join("\n")
    : "No messages were exchanged in the app.";

  const narrative = [
    `${i.playerName} booked ${i.keeperName} through MatchKeeper to play as goalkeeper at ${where}, from ${iso(i.startsAt)} to ${iso(i.endsAt)}. The booking was ${gbp(i.totalPence)} (${gbp(i.ratePence)} for the goalkeeper plus the platform fee).`,
    i.teamReportNote ? `Note from the team when reporting: ${i.teamReportNote}` : null,
    `Chat between the two sides:\n${chat}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    stripe: {
      product_description: cut(
        `A one-off booking of a freelance goalkeeper for an amateur football match at ${where} on ${iso(i.startsAt).slice(0, 10)}. The service is the goalkeeper attending and playing the match.${experience}`,
      ),
      customer_name: i.playerName,
      ...(i.playerEmail ? { customer_email_address: i.playerEmail } : {}),
      service_date: iso(i.startsAt).slice(0, 10),
      cancellation_policy_disclosure: cut(CANCELLATION_POLICY_TEXT),
      access_activity_log: cut(timeline.join("\n")),
      uncategorized_text: cut(narrative),
    },
    checks: evidenceChecks(i),
  };
}
