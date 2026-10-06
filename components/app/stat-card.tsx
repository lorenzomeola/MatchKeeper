import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/platform/icons";

/** Cifra con etiqueta. Con `href` entera es un enlace con flecha. */
export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  tone?: "default" | "accent" | "warning" | "success";
}) {
  const valueTone =
    tone === "accent"
      ? "text-accent-strong"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "text-fg";
  const body = (
    <>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className={`pl-display pl-tnum mt-2 [font-size:var(--t-3xl)] ${valueTone}`}>{value}</p>
      {hint && <p className="mt-1.5 text-[13px] leading-snug text-muted">{hint}</p>}
    </>
  );
  const cls = "pl-surface block rounded-[var(--r-lg)] p-4 sm:p-5";

  if (!href) return <div className={cls}>{body}</div>;
  return (
    <Link href={href} className={`${cls} pl-lift group relative`}>
      {body}
      <ArrowRightIcon className="absolute right-4 top-4 h-4 w-4 text-muted transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
    </Link>
  );
}
