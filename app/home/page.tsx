import type { Metadata } from "next";
import { ProductHome } from "@/components/platform/product-home";
import { getPaymentMode } from "@/lib/payments/mode";

// Landing REAL de producto (no la de validación en "/"). No enlazada desde
// "/" todavía, solo accesible por URL directa.
export const metadata: Metadata = {
  title: "Find a goalkeeper for your football match",
  description:
    "Post your match and nearby goalkeepers apply, or join as a goalkeeper and play more matches. London.",
  robots: { index: false, follow: false },
};

// El texto depende del interruptor de pagos: se regenera cada minuto para reflejar un cambio.
export const revalidate = 60;

export default async function HomePreview() {
  const mode = await getPaymentMode();
  return <ProductHome payments={mode === "paid"} modeUnavailable={mode === "unavailable"} />;
}
