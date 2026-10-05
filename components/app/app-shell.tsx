"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOutAction } from "@/lib/actions/auth";
import { Logo, LogoMark } from "@/components/logo";
import { Avatar } from "@/components/app/avatar";
import { NAV, isActive, type NavItem, type NavVariant } from "@/components/app/nav-config";
import { ToastProvider } from "@/components/app/toast";
import { FloodlightBackdrop } from "@/components/platform/floodlight-backdrop";
import { LogOutIcon, PlusIcon, ShieldCheckIcon } from "@/components/platform/icons";
import { ThemeToggle } from "@/components/platform/theme";

export type ShellBadges = { unread: number; pending: number; reports: number };

type ShellUser = { name: string; avatarUrl: string | null; roleLabel: string };

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="pl-tnum grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-accent-ink">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function countFor(item: NavItem, badges: ShellBadges) {
  if (item.badge === "unread") return badges.unread;
  if (item.badge === "pending") return badges.pending;
  if (item.badge === "reports") return badges.reports;
  return 0;
}

export function AppShell({
  variant,
  isAdmin,
  userId,
  user,
  badges,
  children,
}: {
  variant: NavVariant;
  isAdmin: boolean;
  userId: string;
  user: ShellUser;
  badges: ShellBadges;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const inAdmin = pathname.startsWith("/admin");
  // Un hilo abierto ocupa toda la pantalla en móvil: sin barra superior ni inferior.
  const inThread = /^\/messages\/[^/]+/.test(pathname);
  const inMessages = pathname.startsWith("/messages");
  // El mapa ocupa el espacio entre las barras, sin márgenes en móvil.
  const inMap = pathname === "/map";
  const items = NAV[inAdmin ? "admin" : variant];
  const tabs = items.filter((i) => i.tab);
  const primary = items.find((i) => i.primary);
  const sidebarItems = items.filter((i) => !i.primary);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Next solo restaura el scroll de la ventana; el contenedor interno de móvil hay que subirlo a mano.
  useEffect(() => {
    scrollerRef.current?.scrollTo(0, 0);
  }, [pathname]);

  // Un mensaje nuevo de otra persona refresca el contador sin recargar la página.
  useEffect(() => {
    const channel = supabase
      .channel("shell-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if ((payload.new as { sender_id?: string }).sender_id !== userId) router.refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, router]);

  return (
    <ToastProvider>
      {/* Móvil: solo hace scroll el contenido, no el body; así la barra de Safari iOS nunca tapa la barra inferior. */}
      <div className="relative isolate flex h-dvh flex-col overflow-hidden bg-bg text-fg lg:block lg:h-auto lg:min-h-dvh lg:overflow-visible">
        <FloodlightBackdrop />

        {/* Escritorio: barra lateral fija */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-[color-mix(in_oklab,var(--bg)_80%,transparent)] px-4 py-6 backdrop-blur-xl lg:flex">
          <Link
            href={inAdmin ? "/admin" : "/dashboard"}
            aria-label="MatchKeeper home"
            className="pl-focus inline-flex min-h-11 items-center px-2"
          >
            <Logo iconClassName="h-8 w-9" wordmarkClassName="text-lg" />
          </Link>

          {primary && (
            <Link
              href={primary.href}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--r-md)] bg-accent px-4 text-[15px] font-semibold text-accent-ink shadow-[var(--shadow-glow)] transition-[transform,background-color] duration-200 hover:bg-accent-strong active:scale-[0.98]"
            >
              <PlusIcon className="h-5 w-5" />
              {primary.label}
            </Link>
          )}

          <nav aria-label="Main" className="mt-6 flex-1 overflow-y-auto">
            <ul className="grid gap-1">
              {sidebarItems.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className="group flex min-h-11 items-center gap-3 rounded-[var(--r-md)] px-3 text-[15px] font-medium text-muted transition-colors duration-200 hover:bg-surface hover:text-fg aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent-strong"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      <Badge count={countFor(item, badges)} />
                    </Link>
                  </li>
                );
              })}
            </ul>

            {isAdmin && (
              <Link
                href={inAdmin ? "/dashboard" : "/admin"}
                className="mt-6 flex min-h-11 items-center gap-3 rounded-[var(--r-md)] border border-line px-3 text-[15px] font-medium text-fg-2 transition-colors duration-200 hover:border-line-strong hover:text-fg"
              >
                <ShieldCheckIcon className="h-5 w-5 shrink-0 text-accent" />
                {inAdmin ? "Back to the app" : "Admin"}
              </Link>
            )}
          </nav>

          <div className="mt-4 border-t border-line pt-4">
            <Link
              href="/profile"
              className="flex min-h-14 items-center gap-3 rounded-[var(--r-md)] px-2 transition-colors duration-200 hover:bg-surface"
            >
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{user.name}</span>
                <span className="block truncate text-xs text-muted">{user.roleLabel}</span>
              </span>
            </Link>
            <div className="mt-2 flex items-center justify-between gap-2 px-2">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center gap-2 rounded-[var(--r-sm)] px-2 text-sm font-medium text-muted transition-colors duration-200 hover:text-fg"
                >
                  <LogOutIcon className="h-4 w-4" />
                  Log out
                </button>
              </form>
              <ThemeToggle />
            </div>
          </div>
        </aside>

        <div ref={scrollerRef} className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain lg:overflow-visible lg:pl-64 ${inMap ? "flex flex-col lg:block" : ""}`}>
          {/* Móvil: barra superior */}
          <header className={`pl-glass sticky top-0 z-40 items-center justify-between gap-3 rounded-none border-x-0 border-t-0 px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] ${inThread ? "hidden" : "flex lg:hidden"}`}>
            <Link
              href={inAdmin ? "/admin" : "/dashboard"}
              aria-label="MatchKeeper home"
              className="inline-flex min-h-11 items-center gap-2"
            >
              <LogoMark className="h-7 w-8" />
              <span className="font-display text-base font-bold tracking-tight">
                {inAdmin ? (
                  <span className="text-accent-strong">Admin</span>
                ) : (
                  <>
                    <span className="text-fg">Match</span>
                    <span className="text-accent-strong">Keeper</span>
                  </>
                )}
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link
                  href={inAdmin ? "/dashboard" : "/admin"}
                  className="inline-flex min-h-11 items-center rounded-[var(--r-sm)] px-2 text-[13px] font-semibold text-accent-strong"
                >
                  {inAdmin ? "App" : "Admin"}
                </Link>
              )}
              <ThemeToggle />
              <Link href="/profile" aria-label="Your profile" className="rounded-[var(--r-md)]">
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              </Link>
            </div>
          </header>

          <main
            className={`mx-auto w-full ${inMap ? "max-w-[1500px]" : "max-w-[1100px]"} ${
              inThread
                ? "p-0 lg:px-8 lg:pb-6 lg:pt-6"
                : inMap
                  ? "min-h-0 flex-1 p-0 lg:px-8 lg:pb-6 lg:pt-6"
                  : `px-5 pb-10 pt-5 sm:px-8 ${
                    inMessages ? "lg:pb-6 lg:pt-6" : "lg:pb-16 lg:pt-10"
                  }`
            }`}
          >
            {children}
          </main>
        </div>

        {/* Móvil: barra inferior */}
        <nav
          aria-label="Main"
          className={`pl-glass relative z-50 shrink-0 rounded-none border-x-0 border-b-0 bg-[color-mix(in_oklab,var(--bg-2)_94%,transparent)] pb-[env(safe-area-inset-bottom,0px)] ${inThread ? "hidden" : "lg:hidden"}`}
        >
          <ul className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
            {tabs.map((item) => {
              const active = isActive(pathname, item);
              const count = countFor(item, badges);
              if (item.primary) {
                return (
                  <li key={item.href} className="flex justify-center">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className="-mt-5 flex flex-col items-center gap-1 pb-2 text-[11px] font-medium text-fg-2"
                    >
                      <span className="grid h-14 w-14 place-items-center rounded-[var(--r-lg)] bg-accent text-accent-ink shadow-[var(--shadow-glow)] transition-transform duration-150 active:scale-95">
                        <item.icon className="h-6 w-6" />
                      </span>
                      {item.short ?? item.label}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted transition-colors duration-150 aria-[current=page]:text-accent-strong"
                  >
                    <span
                      className={`relative grid h-8 w-14 place-items-center rounded-full transition-colors duration-200 ${
                        active ? "bg-accent-soft" : ""
                      }`}
                    >
                      <item.icon className="h-[22px] w-[22px]" />
                      {count > 0 && (
                        <span className="absolute right-2 top-0">
                          <Badge count={count} />
                        </span>
                      )}
                    </span>
                    {item.short ?? item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </ToastProvider>
  );
}
