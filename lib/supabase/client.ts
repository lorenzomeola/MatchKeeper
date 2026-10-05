import { createBrowserClient } from "@supabase/ssr";
import { cookieOptions } from "./cookie-options";

// Cliente para Client Components (usa la anon key, protegido por RLS en Postgres).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions },
  );
}
