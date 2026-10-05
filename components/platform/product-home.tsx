import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/platform/button";
import { FloodlightBackdrop } from "@/components/platform/floodlight-backdrop";
import { Faq } from "@/components/platform/faq";
import { HeroMatchCard } from "@/components/platform/hero-match-card";
import {
  ChatIcon,
  CheckIcon,
  LockIcon,
  NoFeeIcon,
  ShieldCheckIcon,
  StarIcon,
  StripeWordmark,
} from "@/components/platform/icons";
import { MATCH_EXAMPLES } from "@/components/platform/match-examples";
import { PlatformNav } from "@/components/platform/nav";
import { Reveal } from "@/components/platform/reveal";
import { SiteFooter } from "@/components/platform/site-footer";
import { StatBand } from "@/components/platform/stat-band";
import { TrustMarquee } from "@/components/platform/trust-marquee";

/* ─────────────────────────────────────────────────────────────────────────────
   Contenido separado del marcado: editar copy nunca obliga a tocar layout, y
   las dos "vías" (equipo / portero) quedan estructuralmente simétricas.
   ──────────────────────────────────────────────────────────────────────────── */

const TEAM_STEPS = [
  {
    title: "Post your match",
    body: "Date, pitch, format and level. It takes about a minute and costs nothing to list.",
  },
  {
    title: "Compare applicants",
    body: "Goalkeepers near you apply at their own rate. You see their rating and how many matches they have played.",
  },
  {
    title: "Pick and play",
    body: "Stripe holds the payment and releases it after you confirm the match was played.",
  },
];

const KEEPER_STEPS = [
  {
    title: "Build your keeper profile",
    body: "Add a photo, your city, a short bio and your experience. Not everything is required, but a fuller profile gets verified faster and earns more trust from teams.",
  },
  {
    title: "Apply to matches",
    body: "Browse open matches near you and apply at the price you want for that match.",
  },
  {
    title: "Play and get paid",
    body: "Once the match is confirmed, Stripe releases your payment. You never have to ask anyone for the money.",
  },
];

const TRUST_CARDS = [
  {
    icon: ShieldCheckIcon,
    title: "Every keeper is reviewed by a human",
    body: "Sign-up is not instant. An admin checks each goalkeeper before they can apply to a single match, so the person who turns up is the person you picked.",
    span: "lg:col-span-2",
    stripe: false,
    checks: ["Identity confirmed", "Experience checked", "Approved by an admin", "Removed after no-shows"],
  },
  {
    icon: LockIcon,
    title: "Money held until it's played",
    body: "Stripe holds the payment and releases it once both sides confirm the match happened.",
    span: "",
    stripe: true,
    checks: undefined,
  },
  {
    icon: StarIcon,
    title: "A track record you can check",
    body: "Rating and matches played, built from real bookings only.",
    span: "",
    stripe: false,
    checks: undefined,
  },
  {
    icon: ChatIcon,
    title: "Talk before kick-off",
    body: "In-app chat for the pitch entrance, the kit colour or a late arrival. You do not have to give a stranger your phone number.",
    span: "lg:col-span-2",
    stripe: false,
    checks: undefined,
  },
];

const PRICING_POINTS = [
  "The keeper sets their own rate, so you see the full price before you book.",
  "15% platform fee, added on top of the keeper's rate and taken once on a confirmed match. Goalkeepers keep 100% of the rate they ask for. There is no subscription and nothing to pay for listing or browsing.",
  "If nobody applies before your match, you are not charged.",
];

/* ─────────────────────────────────────────────────────────────────────────── */

export function ProductHome() {
  return (
    <div className="relative min-h-dvh bg-bg text-fg">
      <FloodlightBackdrop />
      <PlatformNav />

      <main>
        <Hero />
        <TrustMarquee />
        <Numbers />
        <HowItWorks />
        <WhyMatchKeeper />
        <Pricing />
        <Questions />
        <FinalCTA />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ── Hero ──────────────────────────────────────────────────────────────────
   Escritorio: titular a la izquierda y foto a la derecha, con tres tarjetas de
   ejemplo en fila debajo. Móvil: la foto abre a sangre y el titular la pisa
   sobre su base fundida, así la primera pantalla es imagen + mensaje + CTA.
   La foto no se oscurece: el portero viste de negro y se recorta solo contra
   la red; solo se funde la franja de césped de abajo.
   ─────────────────────────────────────────────────────────────────────────── */
const HERO_TRUST = [
  { icon: ShieldCheckIcon, label: "Verified keepers" },
  { icon: LockIcon, label: "Payment held until played" },
  { icon: NoFeeIcon, label: "Free to post" },
];

function Hero() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 pb-16 sm:px-8 sm:pb-24 lg:pt-20">
      <div className="grid items-center lg:grid-cols-2 lg:gap-16">
        <Reveal variant="soft" className="-mx-5 sm:-mx-8 lg:order-last lg:mx-0">
          <div className="relative aspect-square w-full overflow-hidden sm:aspect-[16/10] lg:aspect-[6/5] lg:rounded-[var(--r-2xl)] lg:border lg:border-line lg:shadow-[var(--shadow-4)]">
            <HeroPhoto />
            <span className="absolute left-1/2 top-4 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md lg:hidden">
              <span className="pl-pulse block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              Now in pilot across London
            </span>
          </div>
        </Reveal>

        <Reveal className="relative z-10 mx-auto -mt-16 max-w-[34rem] text-center sm:-mt-24 lg:mx-0 lg:mt-0 lg:text-left">
          <span className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg-2 lg:inline-flex">
            <span className="block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
            Now in pilot across London
          </span>

          <h1 className="pl-display text-fg [font-size:var(--t-6xl)] lg:mt-6">
            Never cancel a match for lack of a{" "}
            <span className="relative inline-block text-accent-strong">
              keeper
              <svg
                aria-hidden
                viewBox="0 0 200 16"
                preserveAspectRatio="none"
                className="pl-swoosh absolute -bottom-2 left-0 h-3 w-full lg:hidden"
              >
                <path d="M4 12 C 60 3, 130 2, 196 8" pathLength={1} />
              </svg>
            </span>
            .
          </h1>

          <p className="pl-prose mx-auto mt-6 max-w-[30rem] [font-size:var(--t-lg)] lg:mx-0">
            Post your match and nearby goalkeepers apply. Compare them by rating, matches played
            and price, then book one. Your payment is held until the match is played.
          </p>

          {/* Una sola llamada, dirigida a quien tiene el problema (el equipo). La nav ya
              ofrece las dos vías; repetirlas aquí diluía la acción principal. El portero
              conserva un enlace propio, para no perder el otro lado del mercado. */}
          <div className="mt-9 flex flex-col items-center gap-3 lg:items-start">
            <Button href="/signup?role=player" size="lg" className="w-full sm:w-auto lg:-ml-[7px]">
              Post your match
            </Button>
            <p className="text-sm text-muted">
              Are you a goalkeeper?{" "}
              <Link
                href="/signup?role=goalkeeper"
                className="pl-focus inline-flex min-h-11 items-center font-semibold text-accent-strong underline underline-offset-4"
              >
                Join as a keeper
              </Link>
            </p>
          </div>

          <ul className="mt-3 hidden flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted lg:flex">
            {["Free to post", "Verified keepers only", "Payment held until it's played"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckIcon className="h-3.5 w-3.5 text-accent" />
                {t}
              </li>
            ))}
          </ul>

          <ul className="mt-8 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-[var(--r-lg)] border border-line bg-surface lg:hidden">
            {HERO_TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-2 px-2 py-4">
                <Icon className="h-5 w-5 text-accent" />
                <span className="text-[12px] font-semibold leading-tight text-fg-2">{label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted lg:hidden">
            Payments handled by
            <StripeWordmark className="h-[13px] text-fg-2" />
            <span className="sr-only">Stripe</span>
          </p>
        </Reveal>
      </div>

      <p className="pl-eyebrow mt-14 text-center lg:hidden">Keepers apply. You choose.</p>

      {/* Móvil: solo la primera tarjeta. Escritorio: las tres en fila. */}
      <Reveal
        delay={200}
        variant="pop"
        className="relative z-10 mx-auto mt-5 grid w-full max-w-[34rem] gap-4 lg:mt-14 lg:max-w-none lg:grid-cols-3 lg:gap-6"
      >
        {MATCH_EXAMPLES.map((example, i) => (
          <div key={example.venue} className={i === 0 ? "" : "hidden lg:block"}>
            <HeroMatchCard example={example} />
          </div>
        ))}
      </Reveal>
    </section>
  );
}

function HeroPhoto() {
  return (
    <>
      <Image
        src="/hero-keeper.jpg"
        alt="A goalkeeper diving across the goalmouth to reach the ball"
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover object-[70%_50%] lg:object-[52%_42%]"
        style={{ filter: "saturate(0.72) contrast(1.06)" }}
      />
      {/* Tinte cálido mínimo para atar la foto a la paleta de marca. */}
      <div
        aria-hidden
        className="absolute inset-0 mix-blend-overlay"
        style={{ background: "var(--accent)", opacity: 0.16 }}
      />
      {/* La base se funde con el fondo, para que la tarjeta no flote sobre un corte. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 hidden h-1/3 lg:block"
        style={{
          background:
            "linear-gradient(to top, color-mix(in oklab, var(--bg) 92%, transparent), transparent)",
        }}
      />
      {/* Móvil: el titular pisa la base, así que esta llega al fondo sólido. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[42%] lg:hidden"
        style={{
          background:
            "linear-gradient(to top, var(--bg) 8%, color-mix(in oklab, var(--bg) 70%, transparent) 45%, transparent)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-16 lg:hidden"
        style={{ background: "linear-gradient(to bottom, color-mix(in oklab, var(--bg) 55%, transparent), transparent)" }}
      />
    </>
  );
}

/* ── Cifras ──────────────────────────────────────────────────────────────── */
function Numbers() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20">
      <Reveal variant="soft">
        <StatBand />
      </Reveal>
    </section>
  );
}

/* ── Cómo funciona ─────────────────────────────────────────────────────────
   Dos columnas simétricas diferenciadas por superficie (neutra vs. acento) y
   no por jerarquía: ninguna de las dos audiencias queda por debajo.
   ─────────────────────────────────────────────────────────────────────────── */
function HowItWorks() {
  return (
    <Reveal
      as="section"
      id="how-it-works"
      className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24"
    >
      <SectionHeading
        eyebrow="How it works"
        title="One platform, two sides of the pitch."
        lead="The same three steps, whichever side of the goal line you are on."
      />

      <div className="mt-14 grid gap-5 lg:grid-cols-2 lg:gap-6">
        <TrackCard
          audience="For players & teams"
          steps={TEAM_STEPS}
          cta={{ href: "/signup?role=player", label: "Post a match" }}
        />
        <TrackCard
          audience="For goalkeepers"
          steps={KEEPER_STEPS}
          cta={{ href: "/signup?role=goalkeeper", label: "Join as a goalkeeper" }}
          accent
          delay={140}
        />
      </div>
    </Reveal>
  );
}

function TrackCard({
  audience,
  steps,
  cta,
  accent = false,
  delay = 0,
}: {
  audience: string;
  steps: { title: string; body: string }[];
  cta: { href: string; label: string };
  accent?: boolean;
  delay?: number;
}) {
  return (
    <Reveal
      variant="pop"
      delay={delay}
      className={`pl-lift flex flex-col overflow-hidden rounded-[var(--r-2xl)] border p-7 sm:p-10 ${
        accent
          ? "border-accent/30 bg-accent-soft shadow-[var(--shadow-3)]"
          : "border-line bg-bg-2 shadow-[var(--shadow-2)]"
      }`}
    >
      <p className="pl-eyebrow">{audience}</p>

      {/* La línea vertical conecta los pasos: se lee como un recorrido, no como
          tres tarjetas sueltas. */}
      <ol className="relative mt-8 flex-1 space-y-7 pl-11">
        <span
          aria-hidden
          className="absolute bottom-3 left-[15px] top-3 w-px"
          style={{
            background:
              "linear-gradient(to bottom, var(--accent), color-mix(in oklab, var(--accent) 18%, transparent))",
          }}
        />
        {steps.map((s, i) => (
          <li key={s.title} className="relative">
            <span
              aria-hidden
              className="pl-tnum absolute -left-11 top-0 grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-bg text-xs font-bold text-accent-strong"
            >
              {i + 1}
            </span>
            <h3 className="pl-display text-fg [font-size:var(--t-lg)] [letter-spacing:-0.01em] [line-height:1.3]">
              {s.title}
            </h3>
            <p className="pl-prose mt-1.5 text-sm">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <Button
          href={cta.href}
          variant={accent ? "primary" : "secondary"}
          size="lg"
          withArrow
          className="w-full sm:w-auto"
        >
          {cta.label}
        </Button>
      </div>
    </Reveal>
  );
}

/* ── Por qué MatchKeeper (bento) ──────────────────────────────────────────── */
function WhyMatchKeeper() {
  return (
    <Reveal
      as="section"
      id="trust"
      className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24"
    >
      <SectionHeading
        eyebrow="Why MatchKeeper"
        title="Putting a stranger in your goal should not feel like a gamble."
        lead="We have no reviews or user numbers to show off yet. What we do have are the mechanics that make this safe for both sides."
      />

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRUST_CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <Reveal
              key={card.title}
              variant="pop"
              delay={i * 80}
              className={`pl-surface pl-lift flex flex-col p-7 sm:p-8 ${card.span}`}
            >
              <span className="grid h-11 w-11 place-items-center rounded-[var(--r-md)] border border-accent/25 bg-accent-soft text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="pl-display mt-5 text-fg [font-size:var(--t-xl)] [letter-spacing:-0.015em] [line-height:1.2]">
                {card.title}
              </h3>
              <p className="pl-prose mt-3 text-sm">{card.body}</p>

              {card.checks && (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {card.checks.map((c) => (
                    <li
                      key={c}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg-2"
                    >
                      <CheckIcon className="h-3 w-3 text-accent" />
                      {c}
                    </li>
                  ))}
                </ul>
              )}

              {card.stripe && (
                <p className="mt-auto flex items-center gap-2 border-t border-line pt-5 text-xs text-muted">
                  Powered by
                  <StripeWordmark className="h-[14px] text-fg-2" />
                  <span className="sr-only">Stripe</span>
                </p>
              )}
            </Reveal>
          );
        })}
      </div>
    </Reveal>
  );
}

/* ── Precio ────────────────────────────────────────────────────────────────
   Un marketplace que esconde su comisión no genera confianza: sección propia,
   número grande y las tres reglas en texto plano.
   ─────────────────────────────────────────────────────────────────────────── */
function Pricing() {
  return (
    <Reveal
      as="section"
      id="pricing"
      className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24"
    >
      <div className="pl-surface overflow-hidden p-7 sm:p-12">
        <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-16">
          <div className="shrink-0">
            <p className="pl-eyebrow">What it costs</p>
            <p className="pl-display pl-tnum mt-4 text-accent-strong [font-size:var(--t-6xl)]">15%</p>
            <p className="mt-2 max-w-[14rem] text-sm text-muted">
              Platform fee on a confirmed match. That is the whole pricing page.
            </p>
          </div>

          <ul className="space-y-4 lg:border-l lg:border-line lg:pl-16">
            {PRICING_POINTS.map((p, i) => (
              <Reveal
                key={p}
                as="li"
                variant="soft"
                delay={i * 90}
                className="flex gap-3 text-[15px] leading-relaxed text-fg-2"
              >
                <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <CheckIcon className="h-3 w-3" />
                </span>
                {p}
              </Reveal>
            ))}
            <li className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted">
              <LockIcon className="h-4 w-4 text-accent" />
              Card details never touch our servers. Payments are processed by
              <StripeWordmark className="h-[13px] text-fg-2" />
              <span className="sr-only">Stripe</span>
            </li>
          </ul>
        </div>
      </div>
    </Reveal>
  );
}

/* ── Preguntas ─────────────────────────────────────────────────────────────
   Va después de precio: para cuando alguien llega aquí, ya sabe qué es y qué
   cuesta, y lo que le queda son las objeciones concretas.
   ─────────────────────────────────────────────────────────────────────────── */
function Questions() {
  return (
    <Reveal
      as="section"
      id="faq"
      className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24"
    >
      <SectionHeading
        eyebrow="Questions"
        title="The things people ask before signing up."
        lead="If yours is not here, email us and we will answer it properly."
      />
      <Faq />
    </Reveal>
  );
}

/* ── CTA final ─────────────────────────────────────────────────────────────
   Único bloque a sangre de acento de toda la página. Llega cuando ya no queda
   nada que leer y, por contraste, se convierte en el punto más brillante.
   ─────────────────────────────────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <Reveal as="section" className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24">
      <div
        className="relative overflow-hidden rounded-[var(--r-2xl)] px-6 py-16 text-center sm:px-12 sm:py-20"
        style={{ background: "var(--accent)" }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--accent-ink) 1px, transparent 1px), linear-gradient(to bottom, var(--accent-ink) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(75% 75% at 50% 0%, #000, transparent)",
            WebkitMaskImage: "radial-gradient(75% 75% at 50% 0%, #000, transparent)",
          }}
        />

        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-ink/80">
            Got a match this weekend?
          </p>
          <h2 className="pl-display mx-auto mt-4 max-w-[18ch] text-accent-ink [font-size:var(--t-5xl)]">
            Pick your side of the pitch.
          </h2>
          <p className="mx-auto mt-5 max-w-[34ch] text-accent-ink/80">
            Creating an account takes less than two minutes.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              href="/signup?role=player"
              size="lg"
              variant="onAccent"
              withArrow
              className="w-full sm:w-auto"
            >
              Find a goalkeeper
            </Button>
            <Button
              href="/signup?role=goalkeeper"
              size="lg"
              variant="quiet"
              className="w-full sm:w-auto"
            >
              Join as a goalkeeper
            </Button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ── Piezas compartidas ───────────────────────────────────────────────────── */
function SectionHeading({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="max-w-[44rem]">
      <p className="pl-eyebrow">{eyebrow}</p>
      <h2 className="pl-display mt-4 text-fg [font-size:var(--t-4xl)] [line-height:1.06]">
        <span className="pl-underline">{title}</span>
      </h2>
      {lead && <p className="pl-prose mt-6 max-w-[38rem] [font-size:var(--t-lg)]">{lead}</p>}
    </div>
  );
}
