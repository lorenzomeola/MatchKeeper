import type { User } from "@supabase/supabase-js";
import { notifyAdminNewKeeper } from "@/lib/email/admin-emails";
import { defer } from "@/lib/email/booking-emails";
import { normalizeInstagram } from "@/lib/instagram";
import { normalizeUkMobile } from "@/lib/phone";
import { isAvailableCity, isCategory, type Category } from "@/lib/profile";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type ProfileInfo = {
  displayName: string;
  role: "player" | "goalkeeper";
  city: string | null;
  category: Category;
  phone: string | null;
  instagram: string | null;
};

/** Datos de perfil que se guardan en user_metadata al registrarse. */
export function profileInfoFromUser(user: User): ProfileInfo {
  const meta = user.user_metadata as {
    display_name?: string;
    role?: string;
    city?: string;
    category?: string;
    mobile?: string;
    instagram?: string;
  };
  const role = meta.role === "goalkeeper" ? "goalkeeper" : "player";
  return {
    displayName: meta.display_name?.trim() || user.email || "New member",
    role,
    city: meta.city && isAvailableCity(meta.city) ? meta.city : null,
    category: isCategory(meta.category) ? meta.category : "men",
    phone: meta.mobile ? normalizeUkMobile(meta.mobile) : null,
    instagram: role === "goalkeeper" && meta.instagram ? normalizeInstagram(meta.instagram) : null,
  };
}

// Devuelve la fila creada: releerla en el mismo render daría la respuesta memoizada de antes del insert.
async function insertProfile(supabase: Client, userId: string, info: ProfileInfo) {
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, role: info.role, display_name: info.displayName, city: info.city, category: info.category })
    .select("*")
    .maybeSingle();
  if (error) return null;
  if (info.phone) {
    const { error: contactError } = await supabase
      .from("profile_contacts")
      .upsert({ profile_id: userId, phone: info.phone, instagram: info.instagram });
    if (contactError) console.error("insertProfile: contact save failed", contactError);
  }
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

/** Móvil e Instagram propios (profile_contacts, privado). Vacío si no hay o si la tabla aún no existe. */
export async function loadMyContact(supabase: Client, userId: string): Promise<{ phone: string | null; instagram: string | null }> {
  const { data } = await supabase.from("profile_contacts").select("phone, instagram").eq("profile_id", userId).maybeSingle();
  return { phone: data?.phone ?? null, instagram: data?.instagram ?? null };
}
