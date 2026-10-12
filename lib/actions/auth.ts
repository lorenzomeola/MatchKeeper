"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAvailableCity } from "@/lib/profile";
import { notifyAdminNewKeeper } from "@/lib/email/admin-emails";
import { defer } from "@/lib/email/booking-emails";

export type AuthActionState = {
  error: string | null;
  checkEmail?: boolean;
  sent?: boolean;
  // Se devuelven para que el formulario no se vacíe tras un error (nunca la contraseña).
  values?: { displayName?: string; city?: string; email?: string };
};

async function getOrigin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

type ProfileInfo = {
  displayName: string;
  role: "player" | "goalkeeper";
  city: string | null;
};

async function ensureProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  info: ProfileInfo,
) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return false;

  const { error } = await supabase.from("profiles").insert({
    id: userId,
    role: info.role,
    display_name: info.displayName,
    city: info.city,
  });
  if (!error && info.role === "goalkeeper") defer(() => notifyAdminNewKeeper(userId));
  return !error;
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const role = formData.get("role") === "goalkeeper" ? "goalkeeper" : "player";
  const city = String(formData.get("city") ?? "").trim();

  const values = { displayName, city, email };

  if (!email || !password || !displayName) {
    return { error: "Please fill in your name, email and password.", values };
  }
  if (!isAvailableCity(city)) {
    return { error: "Choose one of the available cities.", values };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", values };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, role, city },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message, values };
  }

  if (!data.user) {
    return { error: "We couldn't create the account. Please try again.", values };
  }

  // Si "Confirm email" está desactivado en Supabase, ya hay sesión activa.
  if (data.session) {
    await ensureProfile(supabase, data.user.id, { displayName, role, city });
    redirect("/onboarding");
  }

  return { error: null, checkEmail: true, values };
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password.", values: { email } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Incorrect email or password.", values: { email } };
  }

  // Sin perfil, las páginas de la app mandan a /signup en bucle (el enlace de confirmación puede no haberlo creado).
  const meta = data.user.user_metadata as { display_name?: string; role?: string; city?: string };
  const created = await ensureProfile(supabase, data.user.id, {
    displayName: meta.display_name?.trim() || data.user.email || "New member",
    role: meta.role === "goalkeeper" ? "goalkeeper" : "player",
    city: meta.city && isAvailableCity(meta.city) ? meta.city : null,
  });

  redirect(created ? "/onboarding" : "/dashboard");
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter your email.", values: { email } };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Solo se informa de fallos de servicio (p. ej. límite de envíos). Para un
  // email inexistente la respuesta es la misma, así no se revela quién tiene cuenta.
  if (error) {
    console.error("requestPasswordResetAction failed", error);
    return { error: "We couldn't send the email. Wait a minute and try again.", values: { email } };
  }

  return { error: null, sent: true, values: { email } };
}

export async function resetPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "This reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
