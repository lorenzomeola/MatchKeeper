import type { ReactNode } from "react";
import { FloodlightBackdrop } from "@/components/platform/floodlight-backdrop";
import { PlatformNav } from "@/components/platform/nav";
import { PaymentModeNotice } from "@/components/platform/payment-mode-notice";
import { SiteFooter } from "@/components/platform/site-footer";
import { getPaymentMode } from "@/lib/payments/mode";

/**
 * Envoltorio compartido por las páginas legales (Terms, Privacy, Safety):
 * misma nav/fondo/footer que /home, contenido en formato artículo legible.
 * Los hijos pueden ser una función que recibe si los pagos están encendidos.
 */
export async function LegalShell({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  /** Fecha en formato ISO (YYYY-MM-DD), se muestra tal cual. */
  updated: string;
  children: ReactNode | ((payments: boolean) => ReactNode);
}) {
  const mode = await getPaymentMode();
  const payments = mode === "paid";
  return (
    <div className="relative min-h-dvh bg-bg text-fg">
      <FloodlightBackdrop />
      <PlatformNav payments={payments} />

      <main className="mx-auto max-w-[760px] px-5 py-16 sm:px-8 sm:py-24">
        <p className="pl-eyebrow">{eyebrow}</p>
        <h1 className="pl-display mt-4 text-fg [font-size:var(--t-5xl)]">{title}</h1>
        <p className="mt-3 text-sm text-muted">Last updated {updated}</p>

        {mode === "unavailable" ? (
          <PaymentModeNotice className="mt-6" />
        ) : (
          <div className="pl-prose legal-copy mt-10 space-y-6 text-[15px] text-fg-2">
            {typeof children === "function" ? children(payments) : children}
          </div>
        )}
      </main>

      <SiteFooter payments={payments} />
    </div>
  );
}
