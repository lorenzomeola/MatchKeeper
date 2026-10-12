import type { User } from "@supabase/supabase-js";
import { notifyAdminNewKeeper } from "@/lib/email/admin-emails";
import { defer } from "@/lib/email/booking-emails";
import { isAvailableCity } from "@/lib/profile";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type ProfileInfo = {
  displayName: string;
  role: "player" | "goalkeeper";
  city: string | null;
};

/** Datos de perfil que se guardan en user_metadata al registrarse. */
export function profileInfoFromUser(user: User): ProfileInfo {
  const meta = user.user_metadata as { display_name?: string; role?: string; city?: string };
  return {
    displayName: meta.display_name?.trim() || user.email || "New member",
    role: meta.role === "goalkeeper" ? "goalkeeper" : "player",
    city: meta.city && isAvailableCity(meta.city) ? meta.city : null,
  };
}

// Devuelve la fila creada: releerla en el mismo render daría la respuesta memoizada de antes del insert.
async function insertProfile(supabase: Client, userId: string, info: ProfileInfo) {
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, role: info.role, display_name: info.displayName, city: info.city })
    .select("*")
    .maybeSingle();
  if (error) return null;
  if (info.role === "goalkeeper") defer(() => notifyAdminNewKeeper(userId));
  return data;
}

/** Crea el perfil si no existe. Devuelve true solo si lo ha creado ahora. */
export async function ensureProfile(supabase: Client, userId: string, info: ProfileInfo): Promise<boolean> {
  const { data: existing } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (existing) return false;
  return (await insertProfile(supabase, userId, info)) !== null;
}

/** Perfil del usuario; si la cuenta existe sin perfil (el enlace de confirmación no llegó a crearlo) lo crea. */
export async function getOrCreateProfile(supabase: Client, user: User) {
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (profile) return profile;
  return insertProfile(supabase, user.id, profileInfoFromUser(user));
}
