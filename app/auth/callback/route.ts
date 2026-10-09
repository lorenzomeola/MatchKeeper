import { NextResponse } from "next/server";
import { notifyAdminNewKeeper } from "@/lib/email/admin-emails";
import { defer } from "@/lib/email/booking-emails";
import { createClient } from "@/lib/supabase/server";

// Recibe el link de confirmación de email de Supabase (?code=...) y crea el
// profile pendiente (guardado en user_metadata al hacer signUp) si no existe.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Solo rutas internas: evita que ?next= redirija fuera del sitio.
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const meta = data.user.user_metadata as {
        display_name?: string;
        role?: string;
        city?: string;
      };

      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabase.from("profiles").insert({
          id: data.user.id,
          role: meta.role === "goalkeeper" ? "goalkeeper" : "player",
          display_name: meta.display_name ?? data.user.email ?? "Sin nombre",
          city: meta.city ?? null,
        });
        if (!insertError && meta.role === "goalkeeper") {
          const userId = data.user.id;
          defer(() => notifyAdminNewKeeper(userId));
        }
        // Cuenta nueva: lo siguiente es completar el perfil.
        return NextResponse.redirect(`${origin}${next ?? "/onboarding"}`);
      }

      return NextResponse.redirect(`${origin}${next ?? "/dashboard"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
