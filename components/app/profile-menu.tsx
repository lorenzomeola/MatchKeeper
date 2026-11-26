"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/app/avatar";
import { InfoIcon, LogOutIcon, UserIcon } from "@/components/platform/icons";
import { signOutAction } from "@/lib/actions/auth";

const ITEM =
  "flex min-h-12 w-full items-center gap-3 rounded-[var(--r-md)] px-3 text-[15px] font-medium text-fg transition-colors duration-150 hover:bg-surface focus-visible:bg-surface";

/** Menú de la foto de perfil en la barra superior del móvil. */
export function ProfileMenu({
  user,
  supportHref,
}: {
  user: { name: string; avatarUrl: string | null; roleLabel: string };
  supportHref: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const external = supportHref.startsWith("mailto:");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid min-h-11 min-w-11 place-items-center rounded-[var(--r-md)]"
      >
        <Avatar name={user.name} src={user.avatarUrl} size="sm" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="pl-surface absolute right-0 top-full z-50 mt-2 w-64 rounded-[var(--r-lg)] p-2 shadow-[var(--shadow-4)]"
        >
          <div className="flex items-center gap-3 px-3 pb-3 pt-2">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-fg">{user.name}</span>
              <span className="block truncate text-xs text-muted">{user.roleLabel}</span>
            </span>
          </div>
          <div className="border-t border-line pt-1">
            <Link href="/profile" role="menuitem" className={ITEM} onClick={() => setOpen(false)}>
              <UserIcon className="h-5 w-5 shrink-0 text-fg-2" />
              Manage profile
            </Link>
            {external ? (
              <a href={supportHref} role="menuitem" className={ITEM} onClick={() => setOpen(false)}>
                <InfoIcon className="h-5 w-5 shrink-0 text-fg-2" />
                Support
              </a>
            ) : (
              <Link href={supportHref} role="menuitem" className={ITEM} onClick={() => setOpen(false)}>
                <InfoIcon className="h-5 w-5 shrink-0 text-fg-2" />
                Support
              </Link>
            )}
          </div>
          <form action={signOutAction} className="mt-1 border-t border-line pt-1">
            <button type="submit" role="menuitem" className={`${ITEM} !text-danger`}>
              <LogOutIcon className="h-5 w-5 shrink-0" />
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
