import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { readPaymentMode, type PaymentMode } from "./mode-state";

/**
 * Lee el interruptor compartido con `public.payments_enabled()`. La fila ausente
 * representa la beta gratuita; un error o valor desconocido nunca activa pagos.
 */
export const getPaymentMode = cache(async (): Promise<PaymentMode> => {
  const result = await readPaymentMode(async () =>
    createAdminClient()
      .from("app_settings")
      .select("value")
      .eq("key", "payments_enabled")
      .maybeSingle(),
  );
  if (result.mode === "unavailable") {
    console.error("payments_enabled lookup failed or returned an invalid value", result.error);
  }
  return result.mode;
});

export type { PaymentMode } from "./mode-state";
