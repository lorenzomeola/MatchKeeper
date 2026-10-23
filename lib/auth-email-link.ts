import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";

type Auth = Pick<SupabaseClient["auth"], "verifyOtp" | "exchangeCodeForSession">;
type Result =
  | { ok: true; user: User; next: string | null }
  | { ok: false; recovery: boolean; error: AuthError | null };

function internalPath(value: string | null): string | null {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  const base = "https://callback.invalid";
  if (!URL.canParse(value, base)) return null;
  const url = new URL(value, base);
  return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : null;
}

export async function authenticateEmailLink(auth: Auth, params: URLSearchParams): Promise<Result> {
  const type = params.get("type");
  const next = internalPath(params.get("next"));
  const hasToken = params.has("token_hash");
  const recovery = hasToken ? type === "recovery" : next === "/reset-password";
  const token = params.get("token_hash");
  const code = params.get("code") ?? "";

  // A malformed token link must never fall back to another authentication flow.
  if (hasToken && (!token?.trim() || (type !== "email" && type !== "recovery"))) {
    return { ok: false, recovery, error: null };
  }
  if (!hasToken && !code.trim()) return { ok: false, recovery, error: null };

  const { data, error } = hasToken && token && (type === "email" || type === "recovery")
    ? await auth.verifyOtp({ token_hash: token, type })
    : await auth.exchangeCodeForSession(code);

  if (error || !data.user || !data.session) return { ok: false, recovery, error };

  return {
    ok: true,
    user: data.user,
    // Token links have fixed destinations; only legacy PKCE links accept next.
    next: hasToken ? (recovery ? "/reset-password" : null) : next,
  };
}
