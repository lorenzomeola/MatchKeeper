import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

export function getResend(): Resend {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  client = new Resend(key);
  return client;
}

// Sin dominio verificado Resend solo acepta este remitente de pruebas.
export const fromAddress = () => process.env.EMAIL_FROM || "MatchKeeper <onboarding@resend.dev>";
