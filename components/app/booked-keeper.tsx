import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/app/avatar";
import { Spotlight } from "@/components/app/spotlight";
import { CheckIcon, ChatIcon } from "@/components/platform/icons";
import { money } from "@/lib/format";

/** Portero ya reservado, visto por el equipo: cara, tarifa, chat y el estado de la reserva en la misma tarjeta. */
export function BookedKeeper({
  keeperId,
  name,
  avatarUrl,
  rate,
  free,
  chatHref,
  ended,
  children,
}: {
  keeperId: string;
  name: string;
  avatarUrl?: string | null;
  rate: number;
  free: boolean;
  chatHref: string;
  /** La reserva ya no sigue vigente (partido cancelado): se muestra sin el sello de confirmado. */
  ended?: boolean;
  /** Estado y acciones de la reserva (BookingCard incrustado). */
  children?: ReactNode;
}) {
  return (
    <Spotlight className="pl-surface relative overflow-hidden rounded-[var(--r-xl)]">
      {!ended && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-success to-transparent opacity-70"
        />
      )}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-5">
        <Link href={`/keepers/${keeperId}`} aria-label={`${name}'s profile`} className="relative shrink-0">
          <Avatar name={name} src={avatarUrl} size="lg" />
          {!ended && (
            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-[color:var(--bg-2)] bg-success text-[color:var(--bg)]">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </Link>
        <div className="min-w-0">
          {!ended && <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-success">Confirmed keeper</p>}
          <Link
            href={`/keepers/${keeperId}`}
            className="pl-display block truncate text-fg transition-colors duration-200 hover:text-accent-strong [font-size:var(--t-xl)]"
          >
            {name}
          </Link>
          <p className="mt-0.5 text-sm text-muted">
            <span className="pl-tnum font-semibold text-fg-2">{money(rate)}</span> {free ? "asked for this match" : "for this match"}
          </p>
        </div>
        <Link
          href={chatHref}
          className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-md)] border border-line-strong px-4 text-[15px] font-medium text-fg transition-[border-color,transform] duration-200 hover:border-accent active:scale-[0.98] sm:col-span-1"
        >
          <ChatIcon className="h-[18px] w-[18px]" />
          Message
        </Link>
      </div>
      {children && <div className="border-t border-line bg-surface px-4 py-4 sm:px-5 sm:py-5">{children}</div>}
    </Spotlight>
  );
}
