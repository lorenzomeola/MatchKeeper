import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { FloodlightBackdrop } from "@/components/platform/floodlight-backdrop";
import { CheckIcon } from "@/components/platform/icons";
import { ThemeToggle } from "@/components/platform/theme";

export type AuthAside = "login" | "join" | "player" | "goalkeeper";

// Solo afirmaciones que ya hace /home, para que login y registro no prometan
// nada distinto a la página que trajo al usuario hasta aquí.
const ASIDE: Record<AuthAside, { eyebrow: string; title: string; points: string[] }> = {
  login: {
    eyebrow: "Welcome back",
    title: "Your matches, in one place.",
    points: ["Verified keepers only", "Payment held until it's played", "Free to post"],
  },
  join: {
    eyebrow: "Join MatchKeeper",
    title: "Keepers and teams, matched.",
    points: ["Verified keepers only", "Payment held until it's played", "Free to post"],
  },
  player: {
    eyebrow: "For players and teams",
    title: "Never cancel a match for lack of a keeper.",
    points: ["Free to post a match", "Keepers apply at their own rate", "Payment held until it's played"],
  },
  goalkeeper: {
    eyebrow: "For goalkeepers",
    title: "Get booked for the matches you want.",
    points: ["Free to join", "Set your own rate for each match", "Reviewed by a person before you apply"],
  },
};

const KEEPER_PHOTO = { src: "/hero-keeper.jpg", position: "object-[52%_42%]", filter: "saturate(0.72) contrast(1.06)" };
// Cancha vista desde arriba: el registro de equipos no debe parecerse al de porteros.
const PITCH_PHOTO = { src: "/signup-pitch.jpg", position: "object-center", filter: "saturate(0.85) contrast(1.04)" };

const PHOTO: Record<AuthAside, typeof KEEPER_PHOTO> = {
  login: KEEPER_PHOTO,
  join: KEEPER_PHOTO,
  goalkeeper: KEEPER_PHOTO,
  player: PITCH_PHOTO,
};

/**
 * Marco de /login y /signup: columna de formulario a la izquierda y panel con
 * foto a la derecha (solo escritorio), igual que el hero de /home. En móvil la
 * foto se omite: la pantalla es para completar el formulario, no para mirar.
 */
export function AuthShell({
  aside,
  children,
}: {
  aside: AuthAside;
  children: ReactNode;
}) {
  const copy = ASIDE[aside];
  const photo = PHOTO[aside];

  return (
    <div className="relative min-h-dvh bg-bg text-fg">
      <FloodlightBackdrop />

      <div className="mx-auto flex min-h-dvh max-w-[1240px] flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between py-6 sm:py-8">
          <Link href="/home" className="pl-focus inline-flex min-h-11 items-center rounded-[var(--r-sm)]" aria-label="MatchKeeper home">
            <Logo iconClassName="h-8 w-9" wordmarkClassName="text-lg" />
          </Link>
          <ThemeToggle />
        </header>

        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-16">
          <div className="flex flex-col">
            <main className="flex flex-1 flex-col justify-center pb-10 sm:pb-14">
              <div className="mx-auto w-full max-w-[28rem] lg:mx-0">{children}</div>

              <ul className="mx-auto mt-10 grid w-full max-w-[28rem] gap-2.5 text-[13px] text-muted lg:hidden">
                {copy.points.map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <CheckIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
                    {p}
                  </li>
                ))}
              </ul>
            </main>

            <footer className="flex flex-wrap items-center gap-x-3 pb-3 text-xs text-muted sm:pb-5">
              <Link href="/terms" className="pl-focus inline-flex min-h-11 items-center px-1 hover:text-fg">
                Terms
              </Link>
              <Link href="/privacy" className="pl-focus inline-flex min-h-11 items-center px-1 hover:text-fg">
                Privacy
              </Link>
              <Link href="/safety" className="pl-focus inline-flex min-h-11 items-center px-1 hover:text-fg">
                Safety
              </Link>
            </footer>
          </div>

          <aside aria-hidden className="relative hidden pb-8 lg:block">
            <div className="sticky top-8 h-[calc(100dvh-7.5rem)] max-h-[52rem]">
              <div className="relative h-full overflow-hidden rounded-[var(--r-2xl)] border border-line shadow-[var(--shadow-4)]">
                <Image
                  src={photo.src}
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1024px) 46vw, 0px"
                  className={`object-cover ${photo.position}`}
                  style={{ filter: photo.filter }}
                />
                <div className="absolute inset-0 mix-blend-overlay" style={{ background: "var(--accent)", opacity: 0.16 }} />
                <div
                  className="absolute inset-x-0 bottom-0 h-1/2"
                  style={{ background: "linear-gradient(to top, color-mix(in oklab, var(--bg) 94%, transparent), transparent)" }}
                />

                <div className="absolute inset-x-6 bottom-6">
                  <p className="pl-eyebrow">{copy.eyebrow}</p>
                  <p className="pl-display mt-3 max-w-[22rem] text-fg [font-size:var(--t-3xl)]">{copy.title}</p>
                  <ul className="mt-5 grid gap-2.5 text-sm text-fg-2">
                    {copy.points.map((p) => (
                      <li key={p} className="flex items-center gap-2.5">
                        <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
