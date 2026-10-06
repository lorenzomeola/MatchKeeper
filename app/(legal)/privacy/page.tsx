import type { Metadata } from "next";
import { LegalShell } from "@/components/platform/legal-shell";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What MatchKeeper collects, why, and how it's protected.",
};

export default function PrivacyPage() {
  return (
    <LegalShell eyebrow="Legal" title="Privacy Policy" updated="2026-10-06">
      <p>
        <em>
          MatchKeeper is currently in a pilot phase in London. This is a plain-language
          summary of how we handle your data; it will be expanded into a full UK GDPR
          policy before the service scales beyond the pilot.
        </em>
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li>Account details: name, email, city, and role (organiser or goalkeeper).</li>
        <li>Match details you post or apply to: date, location, format, price.</li>
        <li>
          Messages sent through the in-app chat, so both sides can coordinate a match.
        </li>
        <li>
          Check-in location: when a goalkeeper taps &quot;I have arrived&quot;, we record the time,
          their coordinates at that moment and the distance to the pitch. We only read the
          location when they tap the button, never in the background.
        </li>
        <li>
          Payment information, handled entirely by Stripe. We never see or store your
          card details.
        </li>
      </ul>

      <h2>2. Why we collect it</h2>
      <p>
        To operate the marketplace: match organisers with keepers, process payments, review
        goalkeeper profiles, and let you contact the other side of a confirmed booking.
      </p>
      <p>
        The check-in location exists for one purpose: to prove a goalkeeper turned up, so a team
        that did not show up can be charged and a goalkeeper who did can be paid. The other side
        of a booking can see that the goalkeeper checked in, not their exact coordinates, unless
        it is needed to resolve a dispute.
      </p>

      <h2>3. Who it&apos;s shared with</h2>
      <ul>
        <li>The other party to a match you&apos;re booking or applying to (name, rating, price).</li>
        <li>Stripe, to process payments.</li>
        <li>
          Supabase, our database and authentication provider, which stores your account data
          on our behalf.
        </li>
        <li>Vercel, which hosts the site and provides page-view analytics.</li>
        <li>Mapbox, which provides the maps.</li>
      </ul>
      <p>We do not sell your data.</p>

      <h2>4. Your rights</h2>
      <p>
        Under UK GDPR you can ask us to access, correct, or delete your personal data. Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we&apos;ll action it.
      </p>

      <h2>5. Retention</h2>
      <p>
        We keep account and booking data for as long as your account is active, plus a
        reasonable period afterwards for dispute resolution and legal record-keeping.
      </p>
      <p>
        Check-in coordinates are kept for 120 days after the match, which covers the period in
        which a card payment can be disputed. After that we delete the coordinates and keep only
        the time of the check-in and whether it was at the pitch. If a dispute is still open, we
        keep them until it is resolved.
      </p>

      <h2>6. Contact</h2>
      <p>
        Questions about this policy or your data:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalShell>
  );
}
