"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

export function PlatformNav({ payments = true, keeperFirst = false }: { payments?: boolean; keeperFirst?: boolean }) {
  const LINKS = navLinks(payments);
  const team = { href: "/signup?role=player", label: "Find a keeper" };
  const keeper = { href: "/signup?role=goalkeeper", label: "Join as a goalkeeper" };
  const [primary, secondary] = keeperFirst ? [keeper, team] : [team, keeper];
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // La cabecera solo "se materializa" cuando dejas el hero: en el tope, el
  // contenido manda; al hacer scroll, la navegación necesita su propio plano.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Se cierra al pulsar fuera o con Escape; el scroll de fondo sigue libre.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
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
          <Button href={primary.href} size="sm" className="hidden sm:inline-flex">
            {primary.label}
          </Button>
          <Button
            href={secondary.href}
            variant="secondary"
            size="sm"
            className="hidden xl:inline-flex"
          >
            {secondary.label}
          </Button>

          <div ref={menuRef} className="relative xl:hidden">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-haspopup="menu"
              aria-controls="mk-mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className="pl-focus grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-fg-2 transition-colors duration-200 hover:text-fg"
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>

            {open && (
              <div
                id="mk-mobile-nav"
                role="menu"
                aria-label="Menu"
                className="pl-surface pl-menu-in absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2.5rem))] rounded-[var(--r-lg)] p-2 shadow-[var(--shadow-4)]"
              >
                {LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 w-full items-center rounded-[var(--r-md)] px-3 text-[15px] font-medium text-fg transition-colors duration-150 hover:bg-surface focus-visible:bg-surface"
                  >
                    {l.label}
                  </a>
                ))}

                <div className="mt-1 grid gap-2 border-t border-line px-1 pb-1 pt-3">
                  <Button href={primary.href} size="md" withArrow onClick={() => setOpen(false)}>
                    {primary.label}
                  </Button>
                  <Button href={secondary.href} variant="secondary" size="md" onClick={() => setOpen(false)}>
                    {secondary.label}
                  </Button>
                  <Link
                    href="/login"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center justify-center rounded-[var(--r-md)] text-sm font-semibold text-muted transition-colors hover:text-fg"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
