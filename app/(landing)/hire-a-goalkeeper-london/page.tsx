import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/platform/button";
import { AudienceFaq } from "@/components/platform/faq";
import { FloodlightBackdrop } from "@/components/platform/floodlight-backdrop";
import { HeroMatchCard } from "@/components/platform/hero-match-card";
import { ChatIcon, CheckIcon, PinIcon, ShieldCheckIcon, StarIcon } from "@/components/platform/icons";
import { MATCH_EXAMPLES } from "@/components/platform/match-examples";
import { PlatformNav } from "@/components/platform/nav";
import { Reveal } from "@/components/platform/reveal";
import { SiteFooter } from "@/components/platform/site-footer";
import { getPaymentMode, type PaymentMode } from "@/lib/payments/mode";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

const PATH = "/hire-a-goalkeeper-london";
const TITLE = "Hire a goalkeeper in London";
const DESCRIPTION =
  "Short a keeper for your next game? Post your match and verified goalkeepers near you in London apply. Compare them, chat, and pick who plays.";

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
      name: TITLE,
      serviceType: "Goalkeeper matching for amateur football",
      description: DESCRIPTION,
      url: `${SITE_URL}${PATH}`,
      areaServed: { "@type": "City", name: "London" },
      audience: { "@type": "Audience", audienceType: "Amateur football teams" },
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

export default async function HireAGoalkeeperPage() {
  const mode = await getPaymentMode();
  const payments = mode === "paid";
  return (
    <div className="relative min-h-dvh bg-bg text-fg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <FloodlightBackdrop />
      <PlatformNav payments={payments} />

      <main>
        <Hero mode={mode} />
        <Steps mode={mode} />
        <Compare />
        <Formats />
        {mode !== "unavailable" && <Cost payments={payments} />}
        {mode !== "unavailable" && <Questions payments={payments} />}
        <TeamSheet />
      </main>

      <SiteFooter payments={payments} />
    </div>
  );
}

/* ── Hero: el titular dice qué es; la pizarra enseña el hueco que llena ──── */
function Hero({ mode }: { mode: PaymentMode }) {
  const facts =
    mode === "paid"
      ? ["Free to post a match", "Every keeper checked by a person", "You pay only when you book"]
      : mode === "free"
        ? ["Free during the beta", "Every keeper checked by a person", "Adults 18+"]
        : ["Every keeper checked by a person"];

  return (
    <section className="mx-auto max-w-[1240px] px-5 pb-20 pt-8 sm:px-8 sm:pt-12 lg:pb-28 lg:pt-20">
      <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <Reveal className="max-w-[36rem]">
          <p className="pl-eyebrow flex items-center gap-2">
            <PinIcon className="h-3.5 w-3.5" />
            For teams in London
          </p>
          <h1 className="pl-display mt-5 text-fg [font-size:var(--t-6xl)]">
            Hire a <span className="text-accent-strong">goalkeeper</span> in London
          </h1>
          <p className="pl-prose mt-6 max-w-[32rem] [font-size:var(--t-lg)]">
            Keeper dropped out, or you never had one? Post your match on MatchKeeper. Goalkeepers
            near you apply, and you choose who plays.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Button href="/signup/player" size="lg" withArrow className="w-full sm:w-auto">
              Post your match
            </Button>
            <Link
              href="/goalkeeper-matches-london"
              className="pl-focus inline-flex min-h-11 items-center justify-center text-sm font-semibold text-fg-2 underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent-strong"
            >
              I&apos;m a goalkeeper
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
            {facts.map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <CheckIcon className="h-3.5 w-3.5 text-accent" />
                {f}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal variant="pop" delay={140}>
          <PitchBoard />
        </Reveal>
      </div>
    </section>
  );
}

// 7-a-side con el 1 vacío. Coordenadas en % del tablero.
const OUTFIELD = [
  { n: 9, x: 50, y: 16 },
  { n: 7, x: 18, y: 38 },
  { n: 8, x: 50, y: 44 },
  { n: 11, x: 82, y: 38 },
  { n: 5, x: 30, y: 65 },
  { n: 4, x: 70, y: 65 },
];

function PitchBoard() {
  const a = MATCH_EXAMPLES[0].applicants[0];
  return (
    <figure className="relative mx-auto w-full max-w-[30rem]">
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-[var(--r-2xl)] border border-line shadow-[var(--shadow-4)]"
        style={{
          background:
            "repeating-linear-gradient(to bottom, var(--surface-2) 0 12.5%, transparent 12.5% 25%), var(--bg-2)",
        }}
      >
        <svg
          aria-hidden
          viewBox="0 0 100 125"
          className="absolute inset-0 h-full w-full"
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="0.6"
        >
          <rect x="6" y="6" width="88" height="113" />
          <path d="M38 6 A12 12 0 0 0 62 6" />
          <rect x="22" y="91" width="56" height="28" />
          <rect x="37" y="109" width="26" height="10" />
          <path d="M40 91 A11 11 0 0 1 60 91" />
          <circle cx="50" cy="99" r="0.9" fill="var(--line-strong)" stroke="none" />
          <rect x="42" y="119" width="16" height="3" stroke="var(--accent)" strokeWidth="0.8" />
        </svg>

        {OUTFIELD.map((p) => (
          <span
            key={p.n}
            aria-hidden
            className="pl-display pl-tnum absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-bg text-[13px] text-fg-2 shadow-[var(--shadow-2)] sm:h-10 sm:w-10"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {p.n}
          </span>
        ))}

        <div className="absolute left-1/2 top-[88%] -translate-x-1/2 -translate-y-1/2">
          <span className="relative grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-accent bg-accent-soft">
            <span
              aria-hidden
              className="absolute -inset-2 rounded-full border border-accent/50 motion-safe:animate-ping [animation-duration:2.6s]"
            />
            <span className="pl-display text-xl text-accent-strong">1</span>
          </span>
        </div>
        <span className="absolute left-1/2 top-[76%] -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent-ink">
          No. 1 missing
        </span>
      </div>

      <div className="absolute -top-6 right-3 w-[15.5rem] lg:-right-6">
        <ApplicantToast name={a.name} initials={a.initials} rating={a.rating} matches={a.matches} price={a.price} best />
      </div>

      <figcaption className="mt-4 text-center text-xs text-muted">
        Illustration. Names, ratings and prices are examples, not real bookings.
      </figcaption>
    </figure>
  );
}

function ApplicantToast({
  name,
  initials,
  rating,
  matches,
  price,
  best = false,
}: {
  name: string;
  initials: string;
  rating: string;
  matches: number;
  price: string;
  best?: boolean;
}) {
  return (
    <div className="pl-glass flex items-center gap-3 rounded-[var(--r-md)] p-2.5 pr-3.5">
      <span
        aria-hidden
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
          best ? "bg-accent text-accent-ink" : "bg-surface-2 text-fg-2"
        }`}
      >
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-fg">{name} applied</span>
        <span className="pl-tnum flex items-center gap-1 text-[11px] text-muted">
          <StarIcon className="h-3 w-3 text-accent" />
          {rating} · {matches} matches
        </span>
      </span>
      <span className="pl-tnum text-sm font-bold text-fg">{price}</span>
    </div>
  );
}

/* ── Cómo funciona: un raíl horizontal, como el reloj de un partido ──────── */
function Steps({ mode }: { mode: PaymentMode }) {
  const pick =
    mode === "paid"
      ? "Accept the keeper you want and pay when you book. They get their share after the match."
      : mode === "free"
        ? "Accept the keeper you want and sort the details in the chat. During the beta you pay them directly, as you agreed."
        : "Accept the keeper you want and sort the details in the chat.";

  const steps = [
    { title: "Post the match", body: "Pitch, date, kick-off, format and level. It takes about a minute." },
    {
      title: "Keepers apply",
      body: "Goalkeepers near you see it and apply with the rate they want. You see each one's profile, rating and matches played.",
    },
    { title: "Pick one and play", body: pick },
  ];

  return (
    <Reveal
      as="section"
      id="how-it-works"
      className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[40rem]">
          <p className="pl-eyebrow">How it works</p>
          <h2 className="pl-display mt-4 text-fg [font-size:var(--t-4xl)] [line-height:1.06]">
            From an empty goal to a full team sheet.
          </h2>
        </div>
        <p className="max-w-[22rem] text-sm text-muted">
          Three steps, and less ringing round the group chat the night before.
        </p>
      </div>

      <div className="relative mt-14">
        <span
          aria-hidden
          className="absolute bottom-2 left-[19px] top-2 border-l border-dashed border-accent/50 lg:bottom-auto lg:left-0 lg:right-0 lg:top-[19px] lg:border-l-0 lg:border-t"
        />
        <ol className="grid gap-10 lg:grid-cols-3 lg:gap-8">
        {steps.map((s, i) => (
          <Reveal key={s.title} as="li" variant="soft" delay={i * 90} className="relative pl-16 lg:pl-0 lg:pt-16">
            <span
              aria-hidden
              className="pl-tnum absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full border border-accent bg-bg font-mono text-xs font-bold text-accent-strong"
            >
              0{i + 1}
            </span>
            <h3 className="pl-display text-fg [font-size:var(--t-2xl)] [line-height:1.15]">{s.title}</h3>
            <p className="pl-prose mt-2 max-w-[22rem] text-[15px]">{s.body}</p>
          </Reveal>
        ))}
        </ol>
      </div>
    </Reveal>
  );
}

/* ── Comparar antes de elegir ─────────────────────────────────────────────── */
const CHECKS = [
  { icon: ShieldCheckIcon, text: "A person reviewed their profile before they could apply to anything" },
  { icon: StarIcon, text: "Their rating, which only comes from completed bookings, and how many matches they have played" },
  { icon: PinIcon, text: "How far away they are and the rate they are asking for" },
  { icon: ChatIcon, text: "A chat in the app, so you can talk before you accept without giving out your number" },
];

function Compare() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <Reveal>
          <p className="pl-eyebrow">Before you choose</p>
          <h2 className="pl-display mt-4 text-fg [font-size:var(--t-4xl)] [line-height:1.06]">
            Know who&apos;s going in goal.
          </h2>
          <p className="pl-prose mt-5 max-w-[30rem] [font-size:var(--t-lg)]">
            A stranger in your goal shouldn&apos;t be a lottery. For every keeper who applies, you get:
          </p>
          <ul className="mt-8 space-y-4">
            {CHECKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-sm)] border border-accent/25 bg-accent-soft text-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="pt-1.5 text-[15px] leading-relaxed text-fg-2">{text}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal variant="pop" delay={120} className="lg:-rotate-1">
          <HeroMatchCard example={MATCH_EXAMPLES[2]} />
        </Reveal>
      </div>
    </section>
  );
}

/* ── Formatos: un muro tipográfico en vez de otra rejilla de tarjetas ────── */
const FORMATS = ["5-a-side", "7-a-side", "9-a-side", "11-a-side", "Futsal", "Grass", "Artificial turf", "Indoors", "Outdoors"];

function Formats() {
  return (
    <Reveal as="section" className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24">
      <h2 className="pl-eyebrow">Any game you play</h2>
      <p className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 sm:gap-x-6">
        {FORMATS.map((f, i) => (
          <span key={f} className="inline-flex items-baseline gap-x-4 sm:gap-x-6">
            <span
              className={`pl-display [font-size:var(--t-5xl)] transition-colors duration-200 ${
                i % 2 === 0
                  ? "text-fg hover:text-accent-strong"
                  : "text-transparent [-webkit-text-stroke:1.5px_var(--fg-2)] hover:[-webkit-text-stroke-color:var(--accent)]"
              }`}
            >
              {f}
            </span>
            {i < FORMATS.length - 1 && (
              <span aria-hidden className="text-accent [font-size:var(--t-3xl)]">
                /
              </span>
            )}
          </span>
        ))}
      </p>

      <div className="mt-12 grid gap-6 border-t border-line pt-8 sm:grid-cols-2 sm:gap-10">
        <p className="pl-prose text-[15px]">
          Put the format and surface in your post, so keepers know what they&apos;re turning up to.
          The price is whatever the keeper asks for, whatever the format.
        </p>
        <div>
          <p className="text-[15px] leading-relaxed text-fg-2">
            <span className="font-semibold text-fg">Women&apos;s team?</span> Your matches only go
            to female keepers.
          </p>
          <Link
            href="/signup/player?category=women"
            className="pl-focus mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent-strong underline underline-offset-4"
          >
            Post a women&apos;s match
          </Link>
        </div>
      </div>
    </Reveal>
  );
}

/* ── Coste: un "ticket" con talón, no otra tarjeta de precio ──────────────── */
function Cost({ payments }: { payments: boolean }) {
  return (
    <Reveal as="section" variant="pop" className="mx-auto max-w-[1040px] px-5 py-12 sm:px-8 sm:py-16">
      <div className="relative grid overflow-hidden rounded-[var(--r-xl)] border border-accent/30 bg-accent-soft sm:grid-cols-[auto_1fr]">
        <div className="relative flex flex-col justify-center border-b border-dashed border-accent/40 px-8 py-8 sm:border-b-0 sm:border-r sm:px-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-strong">
            {payments ? "Platform fee" : "During the beta"}
          </p>
          <p className="pl-display pl-tnum mt-2 text-accent-strong [font-size:var(--t-6xl)]">
            {payments ? "15%" : "£0"}
          </p>
          <span aria-hidden className="absolute -right-3 -top-3 hidden h-6 w-6 rounded-full bg-bg sm:block" />
          <span aria-hidden className="absolute -bottom-3 -right-3 hidden h-6 w-6 rounded-full bg-bg sm:block" />
        </div>
        <div className="px-8 py-8 sm:px-12">
          <h2 className="pl-display text-fg [font-size:var(--t-2xl)] [line-height:1.2]">
            {payments ? "Free to post. You pay when you book." : "Free while the London beta runs."}
          </h2>
          <p className="pl-prose mt-3 text-[15px]">
            {payments
              ? "Posting a match and looking through applicants costs nothing. When you book, you pay the keeper's rate plus a 15% platform fee, and you see the full price first. If nobody applies, you pay nothing."
              : "MatchKeeper takes no fee and doesn't handle payments during the beta. The keeper tells you what they would ask for, and you agree how to pay them in the chat."}
          </p>
        </div>
      </div>
    </Reveal>
  );
}

/* ── Preguntas: cabecera fija a la izquierda, respuestas a la derecha ─────── */
function Questions({ payments }: { payments: boolean }) {
  return (
    <section id="faq" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="pl-eyebrow">Questions</p>
          <h2 className="pl-display mt-4 text-fg [font-size:var(--t-4xl)] [line-height:1.06]">
            What teams ask us.
          </h2>
          <p className="pl-prose mt-5 max-w-[24rem]">
            Something else? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent-strong underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Reveal>
        <Reveal variant="soft" delay={100}>
          <AudienceFaq audience="team" title="For teams" payments={payments} />
        </Reveal>
      </div>
    </section>
  );
}

/* ── Cierre: la hoja de alineación con el 1 todavía en blanco ─────────────── */
function TeamSheet() {
  return (
    <Reveal as="section" className="mx-auto max-w-[1240px] px-5 pb-24 pt-12 sm:px-8 sm:pb-32">
      <div className="grid items-center gap-10 rounded-[var(--r-2xl)] border border-line bg-bg-2 p-7 shadow-[var(--shadow-3)] sm:p-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="pl-display text-fg [font-size:var(--t-5xl)]">
            Fill the <span className="text-accent-strong">number 1</span> shirt.
          </h2>
          <p className="pl-prose mt-5 max-w-[28rem] [font-size:var(--t-lg)]">
            Post your match and let keepers near you apply. Creating an account takes less than two
            minutes.
          </p>
          <Button href="/signup/player" size="lg" withArrow className="mt-8 w-full sm:w-auto">
            Post your match
          </Button>
        </div>

        <div aria-hidden className="rounded-[var(--r-lg)] border border-line bg-bg p-5 font-mono text-sm sm:p-6">
          <p className="flex justify-between border-b border-line pb-3 text-[11px] uppercase tracking-[0.18em] text-muted">
            <span>Team sheet</span>
            <span>Sun 19:30</span>
          </p>
          <p className="mt-3 flex items-center gap-4 rounded-[var(--r-sm)] bg-accent-soft px-3 py-2.5 text-accent-strong">
            <span className="w-5 font-bold">1</span>
            <span className="flex-1 border-b border-dashed border-accent/50" />
            <span className="font-bold">?</span>
          </p>
          {[4, 5, 7, 8, 9, 11].map((n) => (
            <p key={n} className="flex items-center gap-4 px-3 py-2 text-muted">
              <span className="w-5">{n}</span>
              <span className="flex-1 border-b border-line" />
              <CheckIcon className="h-3.5 w-3.5 text-success" />
            </p>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
