"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/platform/button";
import { CloseIcon, MenuIcon } from "@/components/platform/icons";
import { ThemeToggle } from "@/components/platform/theme";

// Rutas absolutas (no "#ancla") para que la nav funcione igual desde /home
// que desde las páginas legales, que no tienen esas secciones.
function navLinks(payments: boolean) {
  return [
    { href: "/home#how-it-works", label: "How it works" },
    { href: "/home#trust", label: "Why MatchKeeper" },
    payments ? { href: "/home#pricing", label: "Pricing" } : { href: "/home#beta", label: "Free beta" },
    { href: "/home#faq", label: "FAQ" },
  ];
}

export function PlatformNav({ payments = true }: { payments?: boolean }) {
  const LINKS = navLinks(payments);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // La cabecera solo "se materializa" cuando dejas el hero: en el tope, el
  // contenido manda; al hacer scroll, la navegación necesita su propio plano.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Bloquea el scroll de fondo y permite cerrar el menú con Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        scrolled
          ? "border-b border-line bg-[color-mix(in_oklab,var(--bg)_78%,transparent)] shadow-[var(--shadow-2)] backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6 px-5 sm:h-18 sm:px-8">
        <Link href="/home" className="pl-focus shrink-0 rounded-[var(--r-sm)]" aria-label="MatchKeeper home">
          <Logo iconClassName="h-8 w-9" wordmarkClassName="text-lg" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 xl:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="pl-focus rounded-[var(--r-full)] px-3.5 py-2 text-sm font-medium text-muted transition-colors duration-200 hover:bg-surface hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="pl-focus hidden rounded-[var(--r-full)] px-3 py-2 text-sm font-semibold text-fg-2 transition-colors duration-200 hover:text-fg sm:inline-flex"
          >
            Log in
          </Link>
          <Button href="/signup?role=player" size="sm" className="hidden sm:inline-flex">
            Find a keeper
          </Button>
          <Button
            href="/signup?role=goalkeeper"
            variant="secondary"
            size="sm"
            className="hidden xl:inline-flex"
          >
            Join as a goalkeeper
          </Button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mk-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="pl-focus grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-fg-2 transition-colors duration-200 hover:text-fg xl:hidden"
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Panel móvil: se despliega en su propio plano, no empuja el contenido. */}
      <div
        id="mk-mobile-nav"
        hidden={!open}
        className="border-t border-line bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] backdrop-blur-xl xl:hidden"
      >
        <nav aria-label="Mobile" className="mx-auto max-w-[1240px] px-5 py-4">
          <ul className="space-y-1">
            {LINKS.map((l, i) => (
              <li
                key={l.href}
                className="pl-reveal pl-reveal--soft"
                data-visible={open}
                style={{ "--pl-delay": `${i * 55}ms` } as React.CSSProperties}
              >
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="pl-focus block rounded-[var(--r-md)] px-3 py-3 text-base font-medium text-fg-2 transition-colors duration-200 hover:bg-surface hover:text-fg"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-4 grid gap-2 border-t border-line pt-4">
            <Button href="/signup?role=player" size="lg" withArrow onClick={() => setOpen(false)}>
              Find a goalkeeper
            </Button>
            <Button
              href="/signup?role=goalkeeper"
              variant="secondary"
              size="lg"
              onClick={() => setOpen(false)}
            >
              Join as a goalkeeper
            </Button>
            <Link
              href="/login"
              className="pl-focus mt-1 rounded-[var(--r-md)] py-2 text-center text-sm font-semibold text-muted transition-colors hover:text-fg"
            >
              Log in
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
