import type { Metadata } from "next";
import { LegalShell } from "@/components/platform/legal-shell";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What MatchKeeper collects, why, and how it's protected.",
};

// El texto depende del interruptor de pagos: se regenera cada minuto para reflejar un cambio.
export const revalidate = 60;

export default function PrivacyPage() {
  return (
    <LegalShell eyebrow="Legal" title="Privacy Policy" updated="2026-10-14">
      {(payments) => (
        <>
      <p>
        <em>
          {payments
            ? "MatchKeeper is currently in a pilot phase in London."
            : "MatchKeeper is currently in a free beta in London, with no payments through the platform."}{" "}
          This draft describes the current release. The operator must confirm its data-protection
          details with a qualified privacy adviser before beta users are invited.
        </em>
      </p>

      <p>
        MatchKeeper is operated by Lorenzo Meola, who decides how your data is used (the
        &quot;controller&quot; in data protection law). The operator lives in Belgium and the service is
        for people in the UK. The EU GDPR applies to processing by the operator in Belgium; the
        UK GDPR may also apply to services offered to people in the UK. The precise territorial
        scope and any UK representative requirement need professional confirmation. MatchKeeper
        is for people aged 18 or over, so we do not knowingly collect data from anyone younger.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li>Account details: name, email, city, and role (organiser or goalkeeper).</li>
        <li>
          Profile details you choose to add, such as a photo, a short bio, your experience, level
          and age range.
        </li>
        <li>
          If you choose &quot;Near me&quot; on the match map, your browser shares your current location
          with the page to filter and order matches. MatchKeeper does not save that location to
          your profile.
        </li>
        <li>Match details you post or apply to: date, pitch location, format, and the keeper&apos;s requested rate.</li>
        <li>
          Messages sent through the in-app chat, so both sides can coordinate a match. Before a
          keeper is booked, the system blocks common contact details such as phone numbers, email
          addresses, links and social-app names. An admin may review a conversation when handling
          a report or protected-booking dispute.
        </li>
        <li>
          Check-in location: when a goalkeeper taps &quot;I have arrived&quot;, we record the time,
          their coordinates at that moment and the distance to the pitch. We only read the
          location when they tap the button, never in the background.
        </li>
        {payments && (
          <li>
            Protected-booking records such as the amount, payment/refund status and Stripe reference
            identifiers. Stripe collects your card details; MatchKeeper does not see or store your
            full card number.
          </li>
        )}
      </ul>

      <h2>2. Why we use it</h2>
      <p>
        To operate the marketplace: match organisers with keepers,{" "}
        {payments ? "process payments, " : ""}review goalkeeper profiles, and let you contact the
        other side of a confirmed booking. The intended legal bases are listed below and must be
        confirmed by the operator with a qualified privacy adviser before launch:
      </p>
      <ul>
        <li>
          Running your account, matches, applications, chat and bookings, and sending the emails
          that go with them: we need this to provide the service you asked for. We send emails
          about your account, your matches and your bookings. We do not send marketing emails.
        </li>
        <li>
          Check-in location: you share it when you tap the button, and we also have a legitimate
          interest in being able to settle a disagreement about whether a goalkeeper turned up.
        </li>
        <li>
          Reviewing goalkeeper profiles, handling reports, applying strikes and keeping the
          platform safe: our legitimate interest in keeping both sides safe and the service
          honest. We read messages only when a report or a dispute makes it necessary.
        </li>
      </ul>
      <p>
        {payments
          ? "The check-in location exists for one purpose: to prove a goalkeeper turned up, so a team that did not show up can be charged and a goalkeeper who did can be paid."
          : "The check-in location exists for one purpose: to show whether a goalkeeper turned up, so a disagreement about it can be settled."}{" "}
        The other side of a booking can see that the goalkeeper checked in, not their exact
        coordinates, unless it is needed to resolve a dispute.
      </p>

      <h2>3. Who it&apos;s shared with</h2>
      <ul>
        <li>The other party to a match you&apos;re booking or applying to (name, rating, price).</li>
        {payments && <li>Stripe, to process payments.</li>}
        <li>
          Supabase, our database and authentication provider, which stores your account data
          and sends authentication emails through the configured SMTP provider.
        </li>
        <li>Vercel, which hosts the site and provides page-view analytics.</li>
        <li>Resend, which sends our emails.</li>
        <li>Mapbox, which provides the maps and receives your IP address when a map loads.</li>
      </ul>
      <p>
        Goalkeeper profiles are also reviewed by an admin before the goalkeeper can apply to
        matches. We do not sell your data.
      </p>

      <h2>4. Cookies and similar storage</h2>
      <p>
        We use a cookie to keep you logged in, and your browser&apos;s local storage to remember
        whether you prefer the light or the dark theme. Both are needed for the site to work.
        Vercel&apos;s analytics counts page views without using cookies.
      </p>

      <h2>5. Transfers outside the UK and the EU</h2>
      <p>
        Some providers may process data outside the UK or the European Economic Area. Before
        launch, the operator must confirm each provider&apos;s processing locations and document the
        required transfer safeguards. Contact us for the current provider information.
      </p>

      <h2>6. Your rights</h2>
      <p>
        You can ask to access, correct or delete your personal data, restrict or object to
        processing, or receive a copy. Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Requests are handled manually by
        the operator under applicable data-protection law. Some records may need to be retained
        where required for legal claims, security or dispute handling. There is no self-service
        account deletion in the app; a request is not an immediate deletion command.
      </p>
      <p>
        If you are not happy with how we handle your data, you can complain to the Information
        Commissioner&apos;s Office in the UK (ico.org.uk) or to the Belgian Data Protection
        Authority (gegevensbeschermingsautoriteit.be).
      </p>

      <h2>7. Retention</h2>
      <p>
        Account, booking and chat retention periods are not yet fully automated. The operator
        reviews requests manually and retains records only while needed for the service, safety,
        disputes or legal obligations. A documented schedule and deletion workflow must be
        confirmed before the Beta opens.
      </p>
      <p>
        Exact check-in coordinates are scheduled for deletion after 120 days from the match end;
        the purge runs daily, so deletion may happen shortly after that point. If a dispute is
        open, coordinates are retained until it is resolved.{" "}
        {payments
          ? "This supports review of a protected booking."
          : "which leaves time to resolve a disagreement about whether the goalkeeper turned up."}{" "}
        After the purge we retain the check-in time and the measured distance from the pitch; the
        distance is visible to admins reviewing a booking. If a dispute is still open, we keep
        the exact coordinates until it is resolved.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about this policy or your data:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
        </>
      )}
    </LegalShell>
  );
}
