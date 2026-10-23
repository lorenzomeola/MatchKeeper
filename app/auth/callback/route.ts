import { NextResponse } from "next/server";
import { notifyAdminNewKeeper } from "@/lib/email/admin-emails";
import { defer } from "@/lib/email/booking-emails";
import { createClient } from "@/lib/supabase/server";
import { authenticateEmailLink } from "@/lib/auth-email-link";

function redirectTo(origin: string, path: string) {
  const response = NextResponse.redirect(new URL(path, origin));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

// Los enlaces nuevos verifican token_hash sin depender del navegador de origen.
// Se conserva PKCE (?code=...) para enlaces enviados antes de cambiar las plantillas.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const supabase = await createClient();
  const result = await authenticateEmailLink(supabase.auth, searchParams);
  if (!result.ok) {
    console.warn("Email link verification failed", {
      code: result.error?.code ?? "invalid_link",
      status: result.error?.status,
    });
    return redirectTo(origin, result.recovery ? "/forgot-password?error=expired" : "/login?error=auth");
  }
  const { user, next } = result;
  const meta = user.user_metadata as {
    display_name?: string;
    role?: string;
    city?: string;
  };

  const { data: existing, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Email callback profile lookup failed", { code: profileError.code });
    return redirectTo(origin, "/login?error=profile");
  }
  if (!existing) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      role: meta.role === "goalkeeper" ? "goalkeeper" : "player",
      display_name: meta.display_name ?? user.email ?? "Sin nombre",
      city: meta.city ?? null,
    });
    if (insertError) {
      console.error("Email callback profile creation failed", { code: insertError.code });
      return redirectTo(origin, "/login?error=profile");
    }
    if (meta.role === "goalkeeper") {
      const userId = user.id;
      defer(() => notifyAdminNewKeeper(userId));
    }
    return redirectTo(origin, next ?? "/onboarding");
  }

  return redirectTo(origin, next ?? "/dashboard");
}
