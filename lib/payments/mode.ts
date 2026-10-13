import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Si las reservas se cobran. Lee el mismo interruptor que la función SQL `payments_enabled()`
 * (tabla app_settings). Sin la fila, o si la lectura falla, se asume encendido: es el comportamiento
 * original y nunca deja pasar una reserva sin cobro por error.
 */
export const paymentsEnabled = cache(async (): Promise<boolean> => {
  const { data, error } = await createAdminClient()
    .from("app_settings")
    .select("value")
    .eq("key", "payments_enabled")
    .maybeSingle();
  if (error) {
    console.error("payments_enabled lookup failed, assuming payments are on", error);
    return true;
  }
  return data ? data.value === "true" : true;
});
