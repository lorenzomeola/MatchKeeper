import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/platform/icons";

/** Enlace de texto para el borde derecho de una sección ("All matches"). */
export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-strong"
    >
      {children}
      <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Cabecera de página: eyebrow, título, descripción y acciones. En móvil las acciones bajan debajo. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 pb-6 pt-2 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
      <div className="min-w-0">
        {eyebrow && <p className="pl-eyebrow">{eyebrow}</p>}
        <h1 className="pl-display mt-2 text-fg [font-size:var(--t-4xl)]">{title}</h1>
        {description && <p className="pl-prose mt-3 max-w-[38rem] [font-size:var(--t-base)]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

/** Bloque con título propio dentro de una página. */
export function Section({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-10 first:mt-0 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="pl-display text-fg [font-size:var(--t-xl)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
