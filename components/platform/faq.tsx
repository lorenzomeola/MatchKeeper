import Link from "next/link";
import { ChevronDownIcon } from "@/components/platform/icons";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * FAQ con `<details>`/`<summary>` nativos: accesibles por teclado, plegables
 * sin JavaScript y buscables con Ctrl+F incluso cerrados.
 *
 * La política de cancelación vive en una tabla propia (`CancellationTable`)
 * porque es lo que más se consulta antes de pagar y no debe esconderse dentro
 * de un acordeón. Las reglas de Terms y Safety deben coincidir con ella.
 */

type QA = { q: string; a: React.ReactNode };

const TEAM_FAQ: QA[] = [
  {
    q: "What does it cost to post a match?",
    a: (
      <>
        Posting a match and looking through applicants is free. MatchKeeper adds a 15% fee on top
        of the goalkeeper&apos;s rate, only on a match that gets confirmed. The goalkeeper sets their
        own rate, so you see the full price, rate plus fee, before you book.
      </>
    ),
  },
  {
    q: "How do I know a goalkeeper is any good?",
    a: (
      <>
        Every goalkeeper profile is reviewed by a person before it can apply to a match. You can
        also see each keeper&apos;s rating and how many matches they have played through
        MatchKeeper, and read their bio before you decide. Ratings only come from completed
        bookings.
      </>
    ),
  },
  {
    q: "Can I choose the goalkeeper?",
    a: (
      <>
        Yes. Goalkeepers apply to your match and you pick the one you want. You can compare them
        by rating, matches played, distance and price, and message them before you accept.
      </>
    ),
  },
  {
    q: "What if no goalkeeper applies?",
    a: (
      <>
        Then nothing happens and you are not charged. You only pay when you accept a goalkeeper
        and the match goes ahead.
      </>
    ),
  },
  {
    q: "Which formats and pitches do you cover?",
    a: (
      <>
        All of them: 5, 7, 9 and 11-a-side, futsal, grass and artificial turf, indoors or
        outdoors. Describe the format and surface when you post your match so goalkeepers know
        what to expect. The price is whatever the goalkeeper asks for, so it does not change with
        the format.
      </>
    ),
  },
  {
    q: "When do I pay, and when is the money released?",
    a: (
      <>
        Stripe holds your payment after you book. Goalkeepers tap &quot;I have arrived&quot; when they
        get to the pitch. For three days after the match ends you can confirm that everything went
        fine or report a problem. If you do nothing and the goalkeeper checked in, the payment is
        released to them automatically when the three days are up. If they never checked in, we do
        not release it. We hold it and contact you both.
      </>
    ),
  },
  {
    q: "What if the goalkeeper does not turn up?",
    a: (
      <>
        You get a full refund and the goalkeeper receives a strike. Report it within three days of
        the match so we can sort the refund. A no-show suspends the goalkeeper from new matches,
        and a second one within 12 months can get them removed from the platform. The full rules
        are in the <a href="#cancellations">cancellation table</a> above
        and on the <Link href="/safety">Safety page</Link>.
      </>
    ),
  },
  {
    q: "What if it rains or the pitch is closed?",
    a: (
      <>
        Weather does not change the cancellation schedule, so the same time limits apply. If you
        can see bad weather coming, cancel more than 24 hours ahead and it costs nothing. If the
        venue itself closes the pitch on the day, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will look at it case by
        case.
      </>
    ),
  },
];

const KEEPER_FAQ: QA[] = [
  {
    q: "What do I need to create a goalkeeper profile?",
    a: (
      <>
        A complete goalkeeper profile: a photo, your city, a short bio and your experience, such as
        where you have played and at what level. Not everything is required, but the more you add,
        the faster an admin can verify you and the more teams will trust you when you apply.
      </>
    ),
  },
  {
    q: "How does verification work?",
    a: (
      <>
        A person reviews every goalkeeper profile by hand before it can apply to any match. A
        profile with a photo and clear experience is quicker to check than an empty one.
      </>
    ),
  },
  {
    q: "Do I set my own price?",
    a: (
      <>
        Yes. You apply to each match at the rate you want, so you can ask for more when the trip is
        longer or the level is higher.
      </>
    ),
  },
  {
    q: "Is it free for goalkeepers?",
    a: (
      <>
        Yes. Creating a profile and applying to matches costs you nothing, and you receive 100% of
        the rate you ask for. The 15% platform fee is added on top and paid by the team.
      </>
    ),
  },
  {
    q: "When and how do I get paid?",
    a: (
      <>
        Tap &quot;I have arrived&quot; in the app when you get to the pitch. Stripe holds the
        team&apos;s payment from the moment they book, and releases it to you once the team confirms
        the match, or automatically three days after the match ends if they say nothing. If you
        forgot to check in and the team stays silent, we hold the payment and contact you both
        instead. Stripe then pays it out to your bank account on its normal payout schedule. If
        the team does not show up, you still get paid in full.
      </>
    ),
  },
  {
    q: "What if I get there and the team does not show up?",
    a: (
      <>
        Tap &quot;I have arrived&quot; when you reach the pitch. We record the time and where you
        were, and that record shows you turned up. The team is charged in full and you are paid in
        full. If the team says you were not there, we hold the payment and check your check-in and
        the chat before deciding. Check-in only works near the pitch and around kick-off, so tap it
        when you arrive. We keep the exact coordinates for 120 days, then delete them.
      </>
    ),
  },
  {
    q: "What if I need to cancel?",
    a: (
      <>
        Cancel more than 24 hours before kick-off and nothing happens to your profile. Cancel
        later than that, or miss the match without telling anyone, and the team gets a full refund
        and you get a strike. A no-show suspends you from new matches straight away. Three late
        cancellations within 90 days do the same. If something comes up, cancel as early as you
        can.
      </>
    ),
  },
];

type Row = { when: string; outcome: string; tone: "free" | "part" | "full" | "keeper"; note: string };

/* ── Beta gratuita: sin dinero por la plataforma ── */
const TEAM_FAQ_BETA: QA[] = [
  {
    q: "What does it cost to post a match?",
    a: (
      <>
        Nothing. The beta is free for teams and keepers, and MatchKeeper takes no fee and no
        payment. The keeper tells you what they would ask for, and you agree the payment with them
        directly.
      </>
    ),
  },
  TEAM_FAQ[1],
  {
    q: "Can I choose the goalkeeper?",
    a: (
      <>
        Yes. Goalkeepers apply to your match and you pick the one you want. You can compare them
        by rating, matches played, distance and the rate they ask for, and message them before you
        accept.
      </>
    ),
  },
  {
    q: "What if no goalkeeper applies?",
    a: <>Then nothing happens. Keepers nearby can see your match for as long as it is open.</>,
  },
  TEAM_FAQ[4],
  {
    q: "How do I pay the goalkeeper?",
    a: (
      <>
        MatchKeeper does not handle money during the beta. When you pick a keeper, agree in the
        chat how and when you will pay. Goalkeepers tap &quot;I have arrived&quot; when they get to
        the pitch. After the match you have three days to confirm it went fine or report a
        problem. If you do nothing and the goalkeeper checked in, we close the booking
        automatically. If they never checked in, we look at it and contact you both.
      </>
    ),
  },
  {
    q: "What if the goalkeeper does not turn up?",
    a: (
      <>
        Report it within three days of the match. The goalkeeper gets a strike. A no-show suspends
        them from new matches, and a second one within 12 months can get them removed from the
        platform. Because the payment is agreed directly, MatchKeeper cannot refund anything
        during the beta. See the <Link href="/safety">Safety page</Link> for the details.
      </>
    ),
  },
  {
    q: "What if it rains or the pitch is closed?",
    a: (
      <>
        Talk to the goalkeeper in the chat and cancel the booking from the match page, so they find
        out straight away. No fee applies during the beta. If the venue closes the pitch on the
        day, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will look at it.
      </>
    ),
  },
];

const KEEPER_FAQ_BETA: QA[] = [
  KEEPER_FAQ[0],
  KEEPER_FAQ[1],
  {
    q: "Do I set my own price?",
    a: (
      <>
        You tell the team what you would ask for each match. It is up to you, and up to the team to
        accept it.
      </>
    ),
  },
  {
    q: "Is it free for goalkeepers?",
    a: <>Yes. Creating a profile and applying to matches costs nothing, and MatchKeeper takes no fee during the beta.</>,
  },
  {
    q: "When and how do I get paid?",
    a: (
      <>
        During the beta the team pays you directly, as you agreed in the chat. MatchKeeper does not
        handle or guarantee the payment, so agree the amount and how it will be paid before the
        match. Tap &quot;I have arrived&quot; in the app when you get to the pitch, so there is a
        record that you were there.
      </>
    ),
  },
  {
    q: "What if I get there and the team does not show up?",
    a: (
      <>
        Tap &quot;I have arrived&quot; when you reach the pitch. We record the time and where you
        were, and that record shows you turned up. If the team says you were not there, we check
        your check-in and the chat. Check-in only works near the pitch and around kick-off. We keep
        the exact coordinates for 120 days, then delete them. Because the payment is between you
        and the team during the beta, we cannot collect money on your behalf.
      </>
    ),
  },
  {
    q: "What if I need to cancel?",
    a: (
      <>
        Cancel more than 24 hours before kick-off and nothing happens to your profile. Cancel later
        than that, or miss the match without telling anyone, and you get a strike. A no-show
        suspends you from new matches straight away. Three late cancellations within 90 days do
        the same. If something comes up, cancel as early as you can.
      </>
    ),
  },
];

const TEAM_CANCELS_BETA: Row[] = [
  {
    when: "Any time before the match",
    outcome: "No penalty",
    tone: "free",
    note: "Cancel from the match page and tell the keeper in the chat.",
  },
];

const KEEPER_CANCELS_BETA: Row[] = [
  {
    when: "Cancels more than 24 hours before",
    outcome: "No penalty",
    tone: "free",
    note: "The match opens again for other keepers.",
  },
  {
    when: "Cancels later, or does not show",
    outcome: "Strike",
    tone: "keeper",
    note: "A no-show suspends the keeper.",
  },
];

const TEAM_CANCELS: Row[] = [
  {
    when: "More than 24 hours before kick-off",
    outcome: "Free",
    tone: "free",
    note: "Full refund.",
  },
  {
    when: "Between 24 and 2 hours before",
    outcome: "50% charged",
    tone: "part",
    note: "Half is refunded. The goalkeeper is paid for the time they held.",
  },
  {
    when: "Less than 2 hours before, or the team does not show",
    outcome: "100% charged",
    tone: "full",
    note: "The goalkeeper is paid in full.",
  },
];

const KEEPER_CANCELS: Row[] = [
  {
    when: "Cancels more than 24 hours before",
    outcome: "No penalty",
    tone: "free",
    note: "The team gets a full refund.",
  },
  {
    when: "Cancels later, or does not show",
    outcome: "Strike",
    tone: "keeper",
    note: "The team gets a full refund. A no-show suspends the keeper.",
  },
];

const TONE: Record<Row["tone"], string> = {
  free: "text-success",
  part: "text-warning",
  full: "text-danger",
  keeper: "text-danger",
};

export function Faq({ payments = true }: { payments?: boolean }) {
  return (
    <div className="mt-14 space-y-14">
      <CancellationTable payments={payments} />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <FaqGroup title="For players and teams" items={payments ? TEAM_FAQ : TEAM_FAQ_BETA} />
        <FaqGroup title="For goalkeepers" items={payments ? KEEPER_FAQ : KEEPER_FAQ_BETA} />
      </div>
    </div>
  );
}

/* ── Cancelaciones ─────────────────────────────────────────────────────────
   Las dos tablas son <table> reales (cabeceras, scope) y el resultado nunca
   depende solo del color: lleva texto ("Free", "50% charged", "Strike").
   ─────────────────────────────────────────────────────────────────────────── */
function CancellationTable({ payments }: { payments: boolean }) {
  return (
    <div id="cancellations" className="pl-surface scroll-mt-24 p-6 sm:p-10">
      <p className="pl-eyebrow">Cancellations</p>
      <h3 className="pl-display mt-3 text-fg [font-size:var(--t-2xl)]">
        What happens if plans change.
      </h3>
      <p className="pl-prose mt-3 max-w-[40rem] text-sm">
        {payments
          ? "These are the rules for a confirmed booking. Until you have accepted a goalkeeper and paid, you can withdraw for free."
          : "These are the rules for a confirmed booking. No money moves through MatchKeeper during the beta, so they are about strikes and reopening the match, not refunds."}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-10">
        <RuleTable caption="If the team cancels" rows={payments ? TEAM_CANCELS : TEAM_CANCELS_BETA} />
        <RuleTable caption="If the goalkeeper cancels" rows={payments ? KEEPER_CANCELS : KEEPER_CANCELS_BETA} />
      </div>

      <p className="mt-8 border-t border-line pt-5 text-xs leading-relaxed text-muted">
        {payments
          ? "After the match you have three days to confirm it went fine or report a problem. If nobody says anything and the goalkeeper checked in at the pitch, the payment is released to them automatically. If they did not check in, we hold it and contact you both."
          : "After the match you have three days to confirm it went fine or report a problem. If nobody says anything and the goalkeeper checked in at the pitch, the booking closes automatically. If they did not check in, we look at it and contact you both."}
      </p>
    </div>
  );
}

function RuleTable({ caption, rows }: { caption: string; rows: Row[] }) {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <caption className="pb-3 text-left text-[13px] font-semibold text-fg">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">When</th>
          <th scope="col">What happens</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line border-y border-line">
        {rows.map((r) => (
          <tr key={r.when}>
            <th scope="row" className="py-4 pr-4 text-left align-top text-[14px] font-medium text-fg-2">
              {r.when}
            </th>
            <td className="py-4 align-top">
              <p className={`font-semibold ${TONE[r.tone]}`}>{r.outcome}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{r.note}</p>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FaqGroup({ title, items }: { title: string; items: QA[] }) {
  return (
    <div>
      <h3 className="pl-eyebrow">{title}</h3>
      <dl className="mt-5 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <div key={item.q}>
            <details className="pl-faq group">
              <summary className="pl-focus flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left">
                <dt className="text-[15px] font-semibold text-fg">{item.q}</dt>
                <ChevronDownIcon className="pl-faq__chevron h-4 w-4 shrink-0 text-muted" />
              </summary>
              <dd className="pl-prose pb-5 pr-8 text-sm">{item.a}</dd>
            </details>
          </div>
        ))}
      </dl>
    </div>
  );
}
