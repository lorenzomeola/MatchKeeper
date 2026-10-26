import type { Metadata } from "next";
import { LegalShell } from "@/components/platform/legal-shell";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Safety",
  description: "How MatchKeeper reviews goalkeeper profiles and handles match safety reports.",
};

// El texto depende del interruptor de pagos: se regenera cada minuto para reflejar un cambio.
export const revalidate = 60;

export default function SafetyPage() {
  return (
    <LegalShell eyebrow="Legal" title="Safety" updated="2026-10-26">
      {(payments) => (
        <>
      <p>
        Putting someone you&apos;ve never met in your goal, or turning up to play for a stranger,
        should not feel like a gamble. Here is exactly what MatchKeeper does about it, and
        what to do if something goes wrong.
      </p>

      <h2>1. Goalkeeper verification</h2>
      <p>Before a goalkeeper profile can apply to a single match, an admin checks:</p>
      <ul>
        {payments ? (
          <li>Stripe Connect&apos;s identity requirements, which apply only when protected bookings are enabled.</li>
        ) : (
          <li>That the profile is complete and credible: photo, bio and experience.</li>
        )}
        <li>Experience and playing level.</li>
        <li>That the profile hasn&apos;t previously been removed for a no-show or a complaint.</li>
      </ul>
      <p>
        Profile approval is a manual review, not a criminal-record check or a guarantee of identity,
        qualifications, insurance or conduct. You can ask us to review a report or strike you
        believe is incorrect by emailing{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>{payments ? "2. Payment and check-in" : "2. Check-in and payments"}</h2>
      {payments ? (
        <p>
          Stripe processes your payment when you book; MatchKeeper transfers the goalkeeper&apos;s
          share under the Terms. Goalkeepers tap &quot;I have arrived&quot; when they get to the pitch.
          After the match you have three days to confirm
          it went fine or report a problem. If nobody says anything and the goalkeeper checked in,
          their share is transferred automatically. If they did not check in, no transfer is made
          and we contact you both. If nobody applies to your match, you are not charged. The
          cancellation rules are on the <a href="/home#cancellations">home page</a> and in the{" "}
          <a href="/terms">Terms</a>.
        </p>
      ) : (
        <p>
          MatchKeeper does not handle payments during the beta. You agree the amount and how it is
          paid directly with the other side, so agree it in the chat before the match. Goalkeepers
          tap &quot;I have arrived&quot; when they get to the pitch. After the match you have three
          days to confirm it went fine or report a problem. If nobody says anything and the
          goalkeeper checked in, the booking closes automatically. If they did not check in, we
          contact you both. The rules are on the <a href="/home#cancellations">home page</a> and
          in the <a href="/terms">Terms</a>.
        </p>
      )}

      <h2>3. If a goalkeeper doesn&apos;t show up</h2>
      <p>
        Tell us within three days of the match at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, and do not confirm the match as
        played. {payments ? "You get a full refund, and the goalkeeper receives a strike." : "The goalkeeper receives a strike. MatchKeeper cannot refund anything, because it does not handle the payment during the beta."}{" "}
        A no-show suspends
        the goalkeeper from new matches, and a second one within 12 months can lead to their
        profile being removed from the platform.
      </p>

      <h2>4. Before you meet</h2>
      <ul>
        <li>Use the in-app chat to confirm kick-off time and the exact pitch entrance.</li>
        <li>You don&apos;t need to share your personal phone number to arrange a match.</li>
        <li>Meet at a public pitch, as with any amateur match.</li>
      </ul>

      <h2>5. Reporting a problem</h2>
      <p>
        Whether it&apos;s a safety concern, {payments ? "a payment issue" : "a problem with the payment you agreed"}, or behaviour that made you
        uncomfortable, tell us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Include the match date, the
        booking or match link if available, and a brief explanation. Do not send passwords,
        payment-card details or unnecessary information about other people.
        We review reports personally. Support is not monitored continuously and we do not
        guarantee a response time during the beta; do not rely on an email reply for immediate safety.
      </p>

      <h2>6. Emergencies</h2>
      <p>
        MatchKeeper is not an emergency service. If anyone is at immediate risk, call 999
        (or your local emergency number) first.
      </p>
        </>
      )}
    </LegalShell>
  );
}
