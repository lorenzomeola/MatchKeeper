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
    <LegalShell eyebrow="Legal" title="Privacy Policy" updated="2026-10-26">
      {(payments) => (
        <>
      <p>
        <em>
          {payments
            ? "MatchKeeper is currently in a pilot phase in London."
            : "MatchKeeper is currently in a free beta in London, with no payments through the platform."}{" "}
          This policy explains how personal data is used in the current release.
        </em>
      </p>

      <p>
        MatchKeeper is operated by Lorenzo Meola, who decides how your data is used (the
        &quot;controller&quot; in data protection law), acting as an individual based in Belgium.
        The service is for adults in the UK. You can contact the controller at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. MatchKeeper is for people aged
        18 or over, so we do not knowingly collect data from anyone younger.
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
        <li>
          Check-in photo (optional): after checking in, a goalkeeper can add a photo of where they
          are waiting so the team can find them. We remove the camera metadata, including any
          location it holds, before saving the photo. It is stored privately and is never public.
        </li>
        <li>
          Reports, reviews, strikes and support correspondence, including the information you send
          when asking for help or exercising your data rights.
        </li>
        <li>
          Technical information processed by our hosting, authentication and map providers, such as
          IP addresses, browser information, request logs and page-view statistics.
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
        other side of a confirmed booking. We use different legal bases for different purposes:
      </p>
      <ul>
        <li>
          Running your account, matches, applications, chat and bookings, and sending the emails
          that go with them: performance of our agreement to provide the service you asked for. We send emails
          about your account, your matches and your bookings. We do not send marketing emails.
        </li>
        <li>
          Check-in location: our legitimate interest in recording attendance and resolving
          disagreements. Your browser also asks for location permission; permission to use a device
          feature is separate from the legal basis for processing the resulting record.
        </li>
        <li>
          Optional check-in photos and map searches: providing the feature you choose to use.
          A check-in photo is not required to check in or complete a booking.
        </li>
        <li>
          Reviewing goalkeeper profiles, handling reports, applying strikes and keeping the
          platform safe: our legitimate interest in keeping both sides safe and the service
          honest. We read messages only when a report or a dispute makes it necessary.
        </li>
        <li>
          Technical security logs and aggregate usage statistics: our legitimate interest in
          protecting accounts, keeping the service reliable and understanding how it is used.
          Handling data-rights requests and legally required records: compliance with legal obligations.
        </li>
      </ul>
      <p>
        {payments
          ? "The check-in location exists for one purpose: to prove a goalkeeper turned up, so a team that did not show up can be charged and a goalkeeper who did can be paid."
          : "The check-in location exists for one purpose: to show whether a goalkeeper turned up, so a disagreement about it can be settled."}{" "}
        The other side of a booking can see that the goalkeeper checked in, not their exact
        coordinates, unless it is needed to resolve a dispute. If the goalkeeper adds a photo, only
        the team in that booking, the goalkeeper and MatchKeeper admins can see it, so the team can
        find the goalkeeper; admins may also use it when reviewing a report or a dispute.
      </p>

      <h2>3. Who it&apos;s shared with</h2>
      <ul>
        <li>
          Other users can see the match and profile information made available by the service,
          including names, profile photos, playing information, reviews and requested rates.
          Profile photos are stored in a public bucket: anyone with the image URL can view them.
          Chat and check-in photos are not public.
        </li>
        {payments && <li>Stripe, to process payments.</li>}
        <li>
          Supabase, our database and authentication provider, which stores your account data
          and sends authentication emails through the configured SMTP provider.
        </li>
        <li>Vercel, which hosts the site and provides page-view analytics.</li>
        <li>Resend, which receives recipients and email content to send account and service emails.</li>
        <li>
          Mapbox, which provides maps and place search. Your browser sends map requests and the
          pitch or address search terms you enter directly to Mapbox, together with technical
          information such as your IP address. When you select a place and publish a match, we
          store its address and coordinates with the match. Do not enter private information in
          place searches.
        </li>
        <li>
          Cloudflare Email Routing and Google Gmail, which route and receive messages sent to our
          public support email address.
        </li>
      </ul>
      <p>
        Goalkeeper profiles are also reviewed by an admin before the goalkeeper can apply to
        matches. Standing restrictions use strike points: reaching the threshold automatically
        prevents new applications. You can ask for human review of a report, strike or restriction
        by emailing us; an admin can waive a strike made in error. We do not sell your data.
      </p>

      <h2>4. Cookies and similar storage</h2>
      <p>
        We use a cookie to keep you logged in, and your browser&apos;s local storage to remember
        whether you prefer the light or the dark theme. Login cookies support authentication;
        theme storage remembers your display preference. Vercel&apos;s analytics counts page views
        without using cookies. Cookie-free analytics still involves processing technical data.
      </p>

      <h2>5. Transfers outside the UK and the EU</h2>
      <p>
        The Production Supabase database is hosted in London. This does not mean that all data
        stays in the UK: hosting, maps, email, analytics and provider support may involve processing
        outside the UK or the European Economic Area. Provider information is available in the{" "}
        <a href="https://supabase.com/privacy">Supabase privacy policy</a>,{" "}
        <a href="https://vercel.com/legal/privacy-policy">Vercel privacy policy</a>,{" "}
        <a href="https://resend.com/legal/privacy-policy">Resend privacy policy</a>,{" "}
        <a href="https://www.mapbox.com/legal/privacy">Mapbox privacy policy</a>,{" "}
        <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare privacy policy</a> and{" "}
        <a href="https://policies.google.com/privacy">Google privacy policy</a>.
        Contact us to request details of the applicable transfer arrangements and safeguards.
      </p>

      <h2>6. Your rights</h2>
      <p>
        You can ask to access, correct or delete your personal data, restrict or object to
        processing, or receive a copy. Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Requests are handled manually by
        the operator under applicable data-protection law. Write from your account email where
        possible and tell us what you are requesting. We may ask for proportionate information to
        verify your identity; do not send passwords or identity documents unless we explain why
        they are necessary and provide a suitable way to send them. Some records may need to be retained
        where required for legal claims, security or dispute handling. There is no self-service
        account deletion in the app; a request is not an immediate deletion command.
      </p>
      <p>
        We respond to data-rights requests without undue delay and within the applicable legal
        time limit, normally one month. If a lawful extension applies, we explain it and the
        reason within the initial response period. If we cannot grant all or part of a request,
        we explain why and how to challenge the decision. The absence of a guaranteed response
        time for ordinary support does not change these obligations.
      </p>
      <p>
        If you are not happy with how we handle your data, you can complain to the Information
        Commissioner&apos;s Office in the UK (ico.org.uk) or to the Belgian Data Protection
        Authority (gegevensbeschermingsautoriteit.be).
      </p>

      <h2>7. Retention</h2>
      <p>
        Retention during the beta is reviewed manually by purpose, including a monthly review
        of continued necessity; there is no automatic
        account-expiry or general history-deletion job. Account and profile data is kept while
        your account is active and needed to provide the service. When you request account closure
        or erasure, we review which records can be deleted or anonymised and which must temporarily
        remain for an outstanding booking, a specific safety issue, a dispute or a legal obligation.
      </p>
      <ul>
        <li>
          Matches, applications, bookings, reviews and chat: kept while needed for coordination,
          account history or an identified unresolved issue. We review their continued need when
          handling an account-closure or erasure request, rather than treating history as permanently
          exempt from deletion.
        </li>
        <li>
          Reports, strikes and support records: kept while needed to investigate, handle an appeal,
          prevent repeated abuse or meet an identified legal requirement. A strike ceasing to count
          does not automatically delete its record.
        </li>
        <li>
          Check-in time and distance: kept with the booking for attendance history and issue handling;
          these fields are not covered by the exact-coordinate purge. They are reviewed with the
          booking when an erasure or account-closure request is handled.
        </li>
      </ul>
      <p>
        Exact check-in coordinates are scheduled for deletion after 120 days from the match end;
        the purge is scheduled daily, so deletion may happen shortly after that point.
        An open payment dispute can delay this deletion until it is resolved.{" "}
        After the purge we retain the check-in time and the measured distance from the pitch; the
        distance is visible to admins reviewing a booking.
      </p>
      <p>
        A check-in photo follows the same schedule: it is deleted 120 days after the match end, or
        later if a payment dispute is open. A goalkeeper can remove their photo earlier from the booking
        page.
      </p>
      <p>
        Our daily Supabase database backups have a seven-day retention window. A deletion from the
        live database may therefore remain in an older backup until it expires. If a backup is
        restored, erasure decisions must be reapplied before the restored service is reopened.
        Storage image files are not included in these database backups; we do not maintain a
        separate image backup during the beta. Provider logs and email copies follow the relevant
        provider&apos;s retention settings as well as any deletion requests we can make.
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
