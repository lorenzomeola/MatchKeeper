import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/platform/button";
import { AudienceFaq } from "@/components/platform/faq";
import { FloodlightBackdrop } from "@/components/platform/floodlight-backdrop";
import { ArrowRightIcon, CheckIcon, GloveIcon } from "@/components/platform/icons";
import { PlatformNav } from "@/components/platform/nav";
import { Reveal } from "@/components/platform/reveal";
import { SiteFooter } from "@/components/platform/site-footer";
import { getPaymentMode, type PaymentMode } from "@/lib/payments/mode";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

const PATH = "/goalkeeper-matches-london";
const TITLE = "Goalkeeper matches in London";
const DESCRIPTION =
  "Goalkeeper in London? Make a free profile, apply to matches near you at the rate you choose, and play more football. A person reviews every keeper.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: `${TITLE} · ${SITE_NAME}`,
    description: DESCRIPTION,
    url: `${SITE_URL}${PATH}`,
    siteName: SITE_NAME,
    locale: "en_GB",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL },
    {
      "@type": "Service",
      name: "Matches for goalkeepers in London",
      serviceType: "Goalkeeper matching for amateur football",
      description: DESCRIPTION,
      url: `${SITE_URL}${PATH}`,
      areaServed: { "@type": "City", name: "London" },
      audience: { "@type": "Audience", audienceType: "Amateur football goalkeepers" },
      provider: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_URL}/home` },
        { "@type": "ListItem", position: 2, name: TITLE, item: `${SITE_URL}${PATH}` },
      ],
    },
  ],
};

export const revalidate = 60;

export default async function GoalkeeperMatchesPage() {
  const mode = await getPaymentMode();
  const payments = mode === "paid";
  return (
    <div className="relative min-h-dvh bg-bg text-fg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <FloodlightBackdrop />
      <PlatformNav payments={payments} keeperFirst />

      <main>
        <Hero />
        <Rules mode={mode} />
        <Profile />
        {mode !== "unavailable" && <Pay payments={payments} />}
        <Womens />
        {mode !== "unavailable" && <Questions payments={payments} />}
        <Closing />
      </main>

      <SiteFooter payments={payments} />
    </div>
  );
}

/* ── Hero: cartel centrado sobre una red de portería, y debajo el recorrido ─ */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--grid-line) 0 1px, transparent 1px 28px), repeating-linear-gradient(-45deg, var(--grid-line) 0 1px, transparent 1px 28px)",
          maskImage: "radial-gradient(60% 55% at 50% 35%, #000, transparent)",
          WebkitMaskImage: "radial-gradient(60% 55% at 50% 35%, #000, transparent)",
        }}
      />
      <div className="relative mx-auto max-w-[1240px] px-5 pb-16 pt-10 text-center sm:px-8 sm:pt-16 lg:pb-24 lg:pt-24">
        <Reveal>
          <p className="pl-eyebrow inline-flex items-center gap-2">
            <GloveIcon className="h-4 w-4" />
            For goalkeepers in London
          </p>
          <h1 className="pl-display mx-auto mt-6 max-w-[15ch] text-fg [font-size:clamp(2.75rem,5vw+1rem,5.25rem)]">
            Find matches as a <span className="text-accent-strong">goalkeeper</span> in London
          </h1>
          <p className="pl-prose mx-auto mt-6 max-w-[36rem] [font-size:var(--t-lg)]">
            Teams post matches that need a keeper. You apply to the ones that suit you, at the rate
            you choose. Making a profile is free.
          </p>
          <div className="mt-9 flex flex-col items-center gap-2">
            <Button href="/signup/goalkeeper" size="lg" withArrow className="w-full sm:w-auto">
              Create your profile
            </Button>
            <Link
              href="/signup/goalkeeper?category=women"
              className="pl-focus inline-flex min-h-11 items-center text-sm font-semibold text-fg-2 underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent-strong"
            >
              Female keeper? Join for women&apos;s matches
            </Link>
          </div>
        </Reveal>

        <Reveal variant="pop" delay={160} className="mx-auto mt-14 max-w-[56rem] text-left">
          <JoinTracker />
        </Reveal>
      </div>
    </section>
  );
}

const STAGES = [
  { title: "Make your profile", body: "Photo, city, a short bio and your experience.", state: "done" },
  { title: "A person reviews it", body: "Every keeper is checked before they can apply.", state: "now" },
  { title: "Apply to matches", body: "Pick games near you and say your rate.", state: "next" },
] as const;

function JoinTracker() {
  return (
    <div className="pl-glass rounded-[var(--r-xl)] p-5 sm:p-7">
      <p className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        <span>How joining works</span>
        <span className="text-accent-strong">3 stages</span>
      </p>
      <ol className="mt-6 grid gap-5 sm:grid-cols-3 sm:gap-4">
        {STAGES.map((s, i) => (
          <li key={s.title} className="relative flex gap-3.5 sm:flex-col sm:gap-4">
            <span className="flex items-center gap-3 sm:w-full">
              <span
                className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                  s.state === "done"
                    ? "bg-accent text-accent-ink"
                    : s.state === "now"
                      ? "border-2 border-accent bg-bg"
                      : "border border-line-strong bg-bg"
                }`}
              >
                {s.state === "done" && <CheckIcon className="h-4 w-4" />}
                {s.state === "now" && (
                  <span className="pl-pulse block h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                )}
                {s.state === "next" && <span className="font-mono text-[11px] text-muted">{i + 1}</span>}
              </span>
              {i < STAGES.length - 1 && (
                <span
                  aria-hidden
                  className={`hidden h-px flex-1 sm:block ${i === 0 ? "bg-accent" : "border-t border-dashed border-line-strong"}`}
                />
              )}
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-fg">{s.title}</span>
              <span className="mt-0.5 block text-sm text-muted">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ── Las reglas: filas grandes numeradas, no tarjetas ───────────────────── */
function Rules({ mode }: { mode: PaymentMode }) {
  const rules = [
    {
      title: "Set your own rate",
      body:
        mode === "paid"
          ? "You apply to each match at the rate you want and keep all of it. The team pays a 15% fee on top."
          : "For every match you apply to, you say what you'd ask for. The team decides whether to accept.",
    },
    {
      title: "Pick your matches",
      body: "Browse open matches near you and apply to the ones that fit your week. Nobody books you unless you applied.",
    },
    {
      title: "Check in at the pitch",
      body: "Tap \"I have arrived\" when you get there. It records the time and where you were, so there's proof you turned up. We delete the exact location after 120 days.",
    },
    {
      title: "Show up, or cancel early",
      body: "Cancel more than 24 hours before kick-off and nothing happens. Cancel later or miss the match and you get a strike. A no-show suspends you from new matches.",
    },
  ];

  return (
    <section id="how-it-works" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24">
      <Reveal className="max-w-[40rem]">
        <p className="pl-eyebrow">How it works</p>
        <h2 className="pl-display mt-4 text-fg [font-size:var(--t-4xl)] [line-height:1.06]">
          Four things to know before you join.
        </h2>
      </Reveal>

      <ol className="mt-12 border-t border-line">
        {rules.map((r, i) => (
          <Reveal
            key={r.title}
            as="li"
            variant="soft"
            delay={i * 70}
            className="group grid gap-3 border-b border-line py-8 sm:grid-cols-[7rem_1fr] lg:grid-cols-[9rem_0.8fr_1.2fr] lg:items-baseline lg:gap-10"
          >
            <span
              aria-hidden
              className="pl-display pl-tnum text-transparent transition-colors duration-300 [-webkit-text-stroke:1.5px_var(--accent)] [font-size:var(--t-6xl)] group-hover:text-accent"
            >
              0{i + 1}
            </span>
            <h3 className="pl-display text-fg [font-size:var(--t-2xl)] [line-height:1.15]">{r.title}</h3>
            <p className="pl-prose text-[15px] sm:col-start-2 lg:col-start-auto">{r.body}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

/* ── Perfil: una ficha de portero a medio rellenar ───────────────────────── */
const PROFILE_FIELDS = ["A clear photo of you", "Your city", "A short bio", "Where you've played, and at what level"];

function Profile() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid items-center gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Reveal variant="pop" className="order-last flex justify-center lg:order-first">
          <div
            aria-hidden
            className="w-[17.5rem] rotate-2 rounded-[var(--r-xl)] border border-accent/30 p-6 shadow-[var(--shadow-4)] transition-transform duration-500 hover:rotate-0"
            style={{ background: "linear-gradient(160deg, var(--accent-soft), transparent 55%), var(--bg-2)" }}
          >
            <div className="flex items-start justify-between">
              <span className="pl-display text-accent-strong [font-size:var(--t-4xl)]">GK</span>
              <GloveIcon className="h-7 w-7 text-accent" />
            </div>
            <span className="mx-auto mt-4 grid h-24 w-24 place-items-center rounded-full border-2 border-dashed border-accent/60 bg-bg font-mono text-xs uppercase tracking-[0.18em] text-muted">
              You
            </span>
            <ul className="mt-6 space-y-2.5 text-[13px]">
              {["Photo", "City · London", "Bio", "Experience"].map((f) => (
                <li key={f} className="flex items-center justify-between border-b border-line pb-2 text-fg-2">
                  {f}
                  <CheckIcon className="h-3.5 w-3.5 text-accent" />
                </li>
              ))}
            </ul>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Rate: set per match</p>
          </div>
        </Reveal>

        <Reveal>
          <p className="pl-eyebrow">Your profile</p>
          <h2 className="pl-display mt-4 text-fg [font-size:var(--t-4xl)] [line-height:1.06]">
            Give the reviewer something to check.
          </h2>
          <p className="pl-prose mt-5 max-w-[34rem] [font-size:var(--t-lg)]">
            A person approves every goalkeeper before they can apply to a match. Not everything is
            required, but a fuller profile is quicker to check and teams trust it more. Add:
          </p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {PROFILE_FIELDS.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[15px] text-fg-2">
                <CheckIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-accent" />
                {f}
              </li>
            ))}
          </ul>
          <Button href="/signup/goalkeeper" variant="secondary" size="lg" className="mt-9 w-full sm:w-auto">
            Start your profile
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Cobro: la única franja a sangre de la página, con rayas de camiseta ── */
function Pay({ payments }: { payments: boolean }) {
  return (
    <Reveal
      as="section"
      className="relative overflow-hidden py-16 text-accent-ink sm:py-20"
      variant="soft"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(135deg, color-mix(in oklab, var(--accent-ink) 7%, transparent) 0 18px, transparent 18px 36px), var(--accent)",
        }}
      />
      <div className="relative mx-auto grid max-w-[1240px] gap-6 px-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-16">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] opacity-80">Getting paid</p>
          <h2 className="pl-display mt-4 [font-size:var(--t-5xl)]">
            {payments ? "You keep 100% of your rate." : "The team pays you. We take nothing."}
          </h2>
        </div>
        <p className="max-w-[34rem] text-[16px] leading-relaxed opacity-90">
          {payments
            ? "The team pays when they book, and the 15% platform fee goes on top of your rate. After the match, MatchKeeper sends your share to your connected Stripe account. If the team doesn't turn up and you checked in, you're still paid in full."
            : "MatchKeeper doesn't handle money during the beta. The team pays you directly, the way you agreed in the chat, so settle the amount and how you'll be paid before the match."}
        </p>
      </div>
    </Reveal>
  );
}

/* ── Fútbol femenino ─────────────────────────────────────────────────────── */
function Womens() {
  return (
    <Reveal as="section" className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid gap-8 rounded-[var(--r-2xl)] border border-line bg-bg-2 p-7 shadow-[var(--shadow-2)] sm:p-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
        <div>
          <p className="pl-eyebrow">Women&apos;s football</p>
          <h2 className="pl-display mt-4 text-fg [font-size:var(--t-4xl)] [line-height:1.06]">
            Female keeper? You only see women&apos;s matches.
          </h2>
          <p className="pl-prose mt-5 max-w-[32rem]">
            Choose women&apos;s football when you set up your profile. Your list shows women&apos;s
            games near you, and women&apos;s teams&apos; matches only go to female keepers. The review
            is the same for everyone.
          </p>
        </div>
        <div className="lg:justify-self-end">
          <Button href="/signup/goalkeeper?category=women" size="lg" withArrow className="w-full sm:w-auto">
            Join as a female keeper
          </Button>
        </div>
      </div>
    </Reveal>
  );
}

/* ── Preguntas: columna única y centrada ─────────────────────────────────── */
function Questions({ payments }: { payments: boolean }) {
  return (
    <section id="faq" className="mx-auto max-w-[46rem] scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24">
      <Reveal className="text-center">
        <p className="pl-eyebrow">Questions</p>
        <h2 className="pl-display mt-4 text-fg [font-size:var(--t-4xl)] [line-height:1.06]">
          What keepers ask before joining.
        </h2>
        <p className="pl-prose mx-auto mt-4 max-w-[30rem]">
          Not covered here? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent-strong underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Reveal>
      <Reveal variant="soft" delay={100} className="mt-10">
        <AudienceFaq audience="keeper" title="For goalkeepers" payments={payments} />
      </Reveal>
    </section>
  );
}

/* ── Cierre: acción principal y, al lado, la puerta para equipos ─────────── */
function Closing() {
  return (
    <Reveal as="section" className="mx-auto max-w-[1240px] px-5 pb-24 pt-8 sm:px-8 sm:pb-32">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[var(--r-2xl)] border border-accent/30 bg-accent-soft p-8 sm:p-12">
          <h2 className="pl-display text-fg [font-size:var(--t-5xl)]">Gloves on?</h2>
          <p className="pl-prose mt-4 max-w-[30rem] [font-size:var(--t-lg)]">
            Make your profile now and start applying once a person has approved it. It takes less
            than two minutes to create an account.
          </p>
          <Button href="/signup/goalkeeper" size="lg" withArrow className="mt-8 w-full sm:w-auto">
            Create your profile
          </Button>
        </div>

        <Link
          href="/hire-a-goalkeeper-london"
          className="pl-focus pl-lift group flex flex-col justify-between gap-8 rounded-[var(--r-2xl)] border border-line bg-bg-2 p-8 shadow-[var(--shadow-2)] sm:p-10"
        >
          <span className="pl-eyebrow">For teams</span>
          <span>
            <span className="pl-display block text-fg [font-size:var(--t-2xl)] [line-height:1.15]">
              Need a keeper for your team instead?
            </span>
            <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent-strong">
              Hire a goalkeeper in London
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </span>
        </Link>
      </div>
    </Reveal>
  );
}
