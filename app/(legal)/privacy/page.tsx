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
    <LegalShell eyebrow="Legal" title="Privacy Policy" updated="2026-10-13">
      {(payments) => (
        <>
      <p>
        <em>
          {payments
            ? "MatchKeeper is currently in a pilot phase in London."
            : "MatchKeeper is currently in a free beta in London, with no payments through the platform."}{" "}
          This is a plain-language summary of how we handle your data. We will expand and review
          it before the service grows beyond the {payments ? "pilot" : "beta"}.
        </em>
      </p>

      <p>
        MatchKeeper is operated by Lorenzo Meola, who decides how your data is used (the
        &quot;controller&quot; in data protection law). The operator lives in Belgium and the service is
        for people in the UK, so both the EU GDPR and the UK GDPR apply. MatchKeeper is for people
        aged 18 or over, so we do not knowingly collect data from anyone younger.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li>Account details: name, email, city, and role (organiser or goalkeeper).</li>
        <li>
          Profile details you choose to add, such as a photo, a short bio, your experience, level
          and age range.
        </li>
        <li>Match details you post or apply to: date, location, format, price.</li>
        <li>
          Messages sent through the in-app chat, so both sides can coordinate a match.
        </li>
        <li>
          Check-in location: when a goalkeeper taps &quot;I have arrived&quot;, we record the time,
          their coordinates at that moment and the distance to the pitch. We only read the
          location when they tap the button, never in the background.
        </li>
        {payments && (
          <li>
            Payment information, handled entirely by Stripe. We never see or store your card
            details.
          </li>
        )}
      </ul>

      <h2>2. Why we use it</h2>
      <p>
        To operate the marketplace: match organisers with keepers,{" "}
        {payments ? "process payments, " : ""}review goalkeeper profiles, and let you contact the
        other side of a confirmed booking. Our legal basis for each purpose is:
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
          on our behalf.
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
        Some of the providers above may process data outside the UK and the European Economic
        Area. Where they do, the transfer is covered by the safeguards the law requires, such as
        standard contractual clauses.
      </p>

      <h2>6. Your rights</h2>
      <p>
        You can ask us to access, correct or delete your personal data, to limit how we use it, to
        object to it, or to give you a copy of it. Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we&apos;ll action it. To close
        your account and delete your data, use the same address.
      </p>
      <p>
        If you are not happy with how we handle your data, you can complain to the Information
        Commissioner&apos;s Office in the UK (ico.org.uk) or to the Belgian Data Protection
        Authority (gegevensbeschermingsautoriteit.be).
      </p>

      <h2>7. Retention</h2>
      <p>
        We keep account and booking data for as long as your account is active, plus a
        reasonable period afterwards for dispute resolution and legal record-keeping.
      </p>
      <p>
        Check-in coordinates are kept for 120 days after the match,{" "}
        {payments
          ? "which covers the period in which a card payment can be disputed."
          : "which leaves time to resolve a disagreement about whether the goalkeeper turned up."}{" "}
        After that we delete the coordinates and keep only
        the time of the check-in and whether it was at the pitch. If a dispute is still open, we
        keep them until it is resolved.
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
