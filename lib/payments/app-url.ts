import { SITE_URL } from "@/lib/site";

// APP_URL permite apuntar a un preview de Vercel; por defecto localhost en desarrollo.
export function appUrl() {
  return process.env.APP_URL ?? (process.env.NODE_ENV === "production" ? SITE_URL : "http://localhost:3000");
}
