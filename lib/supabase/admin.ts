import "server-only";
import { createClient } from "@supabase/supabase-js";

// Se salta RLS: usar solo en código de servidor que ya comprobó quién es el usuario.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
