import Image from "next/image";
import Link from "next/link";
import { CTAButton } from "@/components/cta-button";
import { FacebookIcon, InstagramIcon, Logo } from "@/components/logo";
import { PitchBackground } from "@/components/pitch-background";
import {
  CheckIcon,
  GloveIcon,
  LockIcon,
  PinIcon,
  ShieldCheckIcon,
  StarIcon,
} from "@/components/platform/icons";
import { TrustMarquee } from "@/components/platform/trust-marquee";
import { Reveal } from "@/components/reveal";
import { content } from "@/lib/content";
import { FORMS, SITE_TAGLINE, SOCIALS } from "@/lib/site";

const t = content;

const PROOF_ICONS = [StarIcon, PinIcon, ShieldCheckIcon, GloveIcon, LockIcon, PinIcon];
const PROOFS = t.proofs.map((text, i) => ({ icon: PROOF_ICONS[i % PROOF_ICONS.length], text }));

export function Landing() {
  return (
    // Texto oscuro sobre naranja: el blanco del tema `:root` da 2.6:1 y no pasa AA.
    <main
      lang={t.htmlLang}
      className="relative"
      style={{ "--accent-ink": "#1a1005" } as React.CSSProperties}
    >
      <PitchBackground />

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo iconClassName="h-11 w-13" wordmarkClassName="text-2xl" />
        <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-xs text-muted sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {t.navPilot}
        </span>
      </header>

      {/* ── 1. Hero ────────────────────────────────────────────────────────── */}
      {/* Móvil: la foto va arriba a sangre y el texto debajo sobre fondo sólido,
          nunca encima del portero. Escritorio: foto a la derecha con máscara. */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none relative aspect-[5/4] w-full md:absolute md:inset-y-0 md:right-0 md:aspect-auto md:w-[66%]">
          <div className="landing-hero-mask relative h-full w-full">
            <Image
              src="/hero-keeper.jpg"
              alt={t.hero.photoAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 66vw"
              className="object-cover object-[70%_50%] md:object-[70%_30%]"
            />
          </div>
          <div
            className="absolute inset-x-0 bottom-0 h-[42%] md:hidden"
            style={{
              background:
                "linear-gradient(to top, var(--bg) 8%, color-mix(in oklab, var(--bg) 70%, transparent) 45%, transparent)",
            }}
          />
        </div>

        {/* Scrim: garantiza contraste del texto sobre la foto en escritorio. */}
        <div
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{
            background:
              "linear-gradient(90deg, var(--bg) 0%, var(--bg) 26%, color-mix(in oklab, var(--bg) 82%, transparent) 44%, transparent 68%)",
          }}
        />

        <div className="relative mx-auto -mt-16 max-w-6xl px-6 pb-16 md:mt-0 md:pb-36 md:pt-24">
          <div className="mx-auto max-w-xl text-center md:mx-0 md:text-left">
            <p
              className="rise-in mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-bg-2/70 px-3 py-1 font-mono text-xs uppercase tracking-widest text-accent-strong backdrop-blur"
              style={{ "--rise-delay": "80ms" } as React.CSSProperties}
            >
              {t.hero.badge}
            </p>
            <h1
              className="rise-in font-display text-5xl font-bold leading-[0.98] tracking-tight text-fg md:text-7xl"
              style={{ "--rise-delay": "200ms" } as React.CSSProperties}
            >
              {t.hero.titleTop}
              <br />
              <span className="text-accent-strong">{t.hero.titleBottom}</span>
            </h1>
            <p
              className="rise-in mx-auto mt-6 max-w-md text-lg leading-relaxed text-muted md:mx-0"
              style={{ "--rise-delay": "340ms" } as React.CSSProperties}
            >
              {t.hero.sub}
            </p>

            <div
              className="rise-in mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center md:justify-start"
              style={{ "--rise-delay": "480ms" } as React.CSSProperties}
            >
              <CTAButton
                href={FORMS.teams}
                target="_blank"
                rel="noopener noreferrer"
                className="py-4 text-base sm:py-3 sm:text-sm"
              >
                {t.hero.ctaTeams}
              </CTAButton>
              <CTAButton
                href={FORMS.goalkeeperRegistration}
                target="_blank"
                rel="noopener noreferrer"
                variant="ghost"
                className="py-4 text-base sm:py-3 sm:text-sm"
              >
                {t.hero.ctaKeepers}
              </CTAButton>
            </div>

            <ul
              className="rise-in mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] font-medium text-fg md:justify-start"
              style={{ "--rise-delay": "560ms" } as React.CSSProperties}
            >
              {t.hero.trust.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4 text-accent-strong" />
                  {item}
                </li>
              ))}
            </ul>

            <p
              className="rise-in mx-auto mt-5 max-w-sm font-mono text-xs leading-relaxed text-muted md:mx-0"
              style={{ "--rise-delay": "640ms" } as React.CSSProperties}
            >
              {t.hero.note}
            </p>
          </div>
        </div>
      </section>

      <TrustMarquee items={PROOFS} />

      {/* ── 2. How it works: justo después del hero, para que el objetivo quede
          claro en el primer scroll. */}
      <HowItWorks />

      {/* ── 3. Benefits (dos columnas: equipos / arqueros) ───────────────── */}
      <Reveal as="section" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl font-bold tracking-tight text-fg md:text-4xl">
          <span className="sweep-heading">{t.benefits.heading}</span>
        </h2>
        <p className="mt-4 max-w-xl text-lg text-muted">{t.benefits.sub}</p>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {[t.benefits.teams, t.benefits.keepers].map((col, colIndex) => (
            <Reveal
              key={col.kicker}
              delay={colIndex * 140}
              className={`flex flex-col rounded-3xl p-6 sm:p-8 md:p-10 ${
                colIndex === 0
                  ? "bg-fg text-bg"
                  : "card-surface"
              }`}
            >
              <p
                className={`font-mono text-xs uppercase tracking-widest ${
                  colIndex === 0 ? "text-accent" : "text-accent-strong"
                }`}
              >
                {col.kicker}
              </p>
              <h3
                className={`mt-3 font-display text-2xl font-bold md:text-3xl ${
                  colIndex === 0 ? "text-bg" : "text-fg"
                }`}
              >
                {col.title}
              </h3>

              <ul className="mt-8 flex-1 space-y-6">
                {col.items.map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <span
                      className="mt-2 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: "var(--accent)" }}
                    />
                    <div>
                      <p
                        className={`font-display text-lg font-semibold ${
                          colIndex === 0 ? "text-bg" : "text-fg"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p
                        className={`mt-1 text-sm leading-relaxed ${
                          colIndex === 0 ? "text-bg/65" : "text-muted"
                        }`}
                      >
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <CTAButton
                href={FORMS[col.href]}
                target="_blank"
                rel="noopener noreferrer"
                variant={colIndex === 0 ? "primary" : "ghost"}
                className="mt-10 self-start"
              >
                {col.cta}
              </CTAButton>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* ── 3. Story (reemplaza la "prueba social": honesto, sin inventar) ─── */}
      <Reveal as="section" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent-strong">
              {t.story.kicker}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-fg md:text-4xl">
              {t.story.heading}
            </h2>
            {t.story.paragraphs.map((p) => (
              <p key={p} className="mt-5 text-lg leading-relaxed text-muted">
                {p}
              </p>
            ))}
            <blockquote className="mt-10 border-l-2 border-accent pl-6 font-display text-2xl font-semibold leading-snug text-fg">
              {t.story.pullquote}
            </blockquote>
          </div>

          <div className="space-y-4">
            {t.story.scenarios.map((s, i) => (
              <Reveal
                key={s.title}
                delay={i * 120}
                className="card-surface rounded-2xl p-6 md:p-7"
              >
                <p className="font-display text-lg font-semibold text-fg">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── 5. Final CTA (los 3 formularios) ───────────────────────────────── */}
      <Reveal as="section" className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-[2rem] bg-fg px-6 py-16 text-center md:px-12 md:py-20">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            {t.finalCta.kicker}
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-bg md:text-5xl">
            {t.finalCta.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-bg/60">{t.finalCta.sub}</p>

          <div className="mt-12 grid gap-4 text-left md:grid-cols-3">
            {t.finalCta.cards.map((c, i) => (
              <Reveal
                key={c.tag}
                delay={i * 120}
                className="flex flex-col rounded-2xl border border-bg/15 bg-bg/[0.04] p-7 transition-colors duration-300 hover:border-accent/50"
              >
                <p className="font-mono text-xs uppercase tracking-widest text-accent">
                  {c.tag}
                </p>
                <h3 className="mt-3 font-display text-xl font-bold text-bg">{c.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-bg/60">{c.body}</p>
                <CTAButton
                  href={FORMS[c.href]}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant={i === 0 ? "primary" : "invert"}
                  className="mt-7 self-start"
                >
                  {c.cta}
                </CTAButton>
              </Reveal>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <Logo iconClassName="h-7 w-8" wordmarkClassName="text-sm" />
            <span className="font-mono text-[11px] text-muted">{SITE_TAGLINE}</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={SOCIALS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="MatchKeeper on Instagram"
              className="inline-flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-accent-strong"
            >
              <InstagramIcon />
            </a>
            <a
              href={SOCIALS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="MatchKeeper on Facebook"
              className="inline-flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-accent-strong"
            >
              <FacebookIcon />
            </a>
          </div>
          <nav aria-label="Legal" className="flex items-center gap-4 text-xs">
            <Link href="/privacy" className="inline-flex min-h-11 items-center transition-colors hover:text-accent-strong">
              Privacy
            </Link>
            <Link href="/terms" className="inline-flex min-h-11 items-center transition-colors hover:text-accent-strong">
              Terms
            </Link>
          </nav>
          <span className="font-mono text-xs">{t.footerTagline}</span>
        </div>
      </footer>
    </main>
  );
}

function HowItWorks() {
  return (
    <Reveal as="section" id="how-it-works" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <h2 className="font-display text-3xl font-bold tracking-tight text-fg md:text-4xl">
        <span className="sweep-heading">{t.how.heading}</span>
      </h2>
      <p className="mt-4 max-w-xl text-lg text-muted">{t.how.sub}</p>

      <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 md:mt-12 lg:grid-cols-4">
        {t.how.steps.map((s, i) => (
          <Reveal
            key={s.n}
            delay={i * 110}
            className="flex gap-5 bg-bg-2 p-6 sm:block md:p-8"
          >
            <span className="font-display text-3xl font-bold text-accent-strong sm:text-4xl sm:text-accent/35">
              {s.n}
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold text-fg sm:mt-4">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted sm:mt-2">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <p className="mt-6 max-w-2xl border-l-2 border-amber/40 pl-4 font-mono text-xs leading-relaxed text-amber">
        {t.how.note}
      </p>

      <div className="card-surface mt-6 rounded-3xl p-6 sm:p-8 md:p-10">
        <h3 className="font-display text-xl font-bold text-fg md:text-2xl">
          {t.how.coverage.heading}
        </h3>
        <p className="mt-3 max-w-2xl text-muted">{t.how.coverage.body}</p>
        <p className="mt-4 max-w-2xl border-l-2 border-amber/40 pl-4 font-mono text-xs leading-relaxed text-amber">
          {t.how.coverage.note}
        </p>
      </div>
    </Reveal>
  );
}
