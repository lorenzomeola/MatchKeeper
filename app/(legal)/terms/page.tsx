import type { Metadata } from "next";
import { LegalShell } from "@/components/platform/legal-shell";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using MatchKeeper as a team, player or goalkeeper.",
};

export default function TermsPage() {
  return (
    <LegalShell eyebrow="Legal" title="Terms of Service" updated="2026-10-06">
      <p>
        <em>
          MatchKeeper is currently in a pilot phase in London. These terms cover how the
          platform works today; they will be expanded and formally reviewed by a solicitor
          before the service scales beyond the pilot.
        </em>
      </p>

      <p>
        These terms apply when you create an account, post a match, or apply to a match as a
        goalkeeper on MatchKeeper (&quot;the platform&quot;).
      </p>

      <h2>1. What MatchKeeper is</h2>
      <p>
        MatchKeeper is a marketplace that connects organisers of amateur football matches
        (&quot;organisers&quot;) with independent goalkeepers (&quot;keepers&quot;). We are not a party to the
        match itself, and keepers are not our employees. Each keeper offers their services
        independently and sets their own rate.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must provide accurate information when you sign up.</li>
        <li>
          Goalkeeper profiles are reviewed by an admin before they can apply to matches.
          We may decline or remove a profile at our discretion, including after a confirmed
          no-show or a serious complaint.
        </li>
        <li>You are responsible for anything that happens under your account.</li>
      </ul>

      <h2>3. Booking a match</h2>
      <ul>
        <li>Organisers post a match with date, location, format and level.</li>
        <li>Keepers apply with their own rate. The organiser chooses who to accept.</li>
        <li>
          Payment is taken when you book and held by Stripe. Goalkeepers confirm their arrival in
          the app when they get to the pitch. The payment is released to the goalkeeper when the
          team confirms the match, or automatically three days after the match ends if nobody
          reports a problem and the goalkeeper checked in. See <a href="/safety">Safety</a> for
          what happens if the goalkeeper does not turn up.
        </li>
        <li>
          When a goalkeeper taps &quot;I have arrived&quot;, MatchKeeper records the time, their
          location at that moment and how far they are from the pitch. Check-in only works close
          to the pitch and around kick-off. This record is how we show that the goalkeeper
          turned up. See the <a href="/privacy">Privacy Policy</a> for how long we keep it.
        </li>
        <li>
          MatchKeeper adds a 15% platform fee on top of the keeper&apos;s rate. The team pays the
          total and the goalkeeper receives 100% of their rate.
        </li>
      </ul>

      <h2>4. Cancellations</h2>
      <p>
        Until you have accepted a goalkeeper and paid, you can withdraw for free. After that,
        these rules apply to a confirmed booking.
      </p>
      <p>
        <strong>If the team cancels:</strong>
      </p>
      <ul>
        <li>More than 24 hours before kick-off: free, with a full refund.</li>
        <li>
          Between 24 and 2 hours before kick-off: 50% of the booking total is charged and the
          other 50% is refunded. The goalkeeper is paid for the time they held, and the platform
          fee applies as usual to the part that is charged.
        </li>
        <li>
          Less than 2 hours before kick-off, or if the team does not show up: 100% is charged and
          the goalkeeper is paid in full.
        </li>
      </ul>
      <p>
        <strong>If the goalkeeper cancels:</strong>
      </p>
      <ul>
        <li>More than 24 hours before kick-off: no penalty, and the team is refunded in full.</li>
        <li>
          Later than that, or if the goalkeeper does not show up: the team is refunded in full
          and the goalkeeper receives a strike.
        </li>
      </ul>
      <p>
        <strong>Strikes.</strong> A no-show counts as 3 points for 12 months. A late cancellation
        counts as 1 point for 90 days. At 3 points or more the goalkeeper cannot apply to new
        matches until the points expire or we cancel a strike made by mistake. Matches already
        booked are not affected automatically. Two no-shows within 12 months can lead to removal
        from the platform.
      </p>
      <p>
        Weather does not change this schedule. If the venue closes the pitch on the day, contact
        us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will review it case
        by case.
      </p>
      <p>
        After the match, the team has three days to confirm it went fine or report a problem. If
        nobody responds in that time and the goalkeeper checked in at the pitch, the payment is
        released to the goalkeeper automatically. If the goalkeeper did not check in, we hold the
        payment and contact both sides before releasing or refunding it.
      </p>
      <p>
        If the team does not show up and the goalkeeper checked in at the pitch, the check-in
        record is the evidence that the goalkeeper was there. The team is charged in full and the
        goalkeeper is paid, as set out above. If the team says the goalkeeper was not there, we
        hold the payment and review the check-in record and the chat before deciding. A check-in
        is strong evidence, but not the only thing we look at.
      </p>

      <h2>5. Payments</h2>
      <p>
        Payments are processed by Stripe. MatchKeeper never stores your card details. Stripe&apos;s
        own terms apply to the processing of your payment.
      </p>
      <p>
        If a team disputes a payment with its bank and the dispute results from the goalkeeper not
        providing the service, MatchKeeper may recover from the goalkeeper the amount it paid out
        for that match. It does so by reversing the payout or by deducting that amount from the
        goalkeeper&apos;s future payouts, and the goalkeeper can see any amount owed in the app. If
        the dispute is later won, the amount recovered is returned to the goalkeeper.
        MatchKeeper does not recover it from goalkeepers in other cases, such as card fraud or a
        team disputing in bad faith.
      </p>

      <h2>6. Liability</h2>
      <p>
        MatchKeeper provides the platform &quot;as is&quot; during the pilot. We do our best to verify
        keeper profiles, but we cannot guarantee the conduct of any user. Use common sense and
        see <a href="/safety">Safety</a>.
      </p>

      <h2>7. Changes</h2>
      <p>
        We may update these terms as the platform evolves out of pilot. We&apos;ll post the date
        of the latest change at the top of this page.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about these terms:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalShell>
  );
}
