"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BIO_MAX, KEEPER_BIO_MIN, LEVELS, PLAYER_KINDS, isAgeRange, isAvailableCity, type PlayerKind } from "@/lib/profile";

export type ProfileActionState = {
  error: string | null;
  fieldErrors?: Partial<
    Record<"displayName" | "city" | "bio" | "experienceYears" | "ageRange" | "teamName" | "avatarUrl" | "playerKind", string>
  >;
};

export async function saveProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: current } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!current) return { error: "We couldn't find your profile. Log out and sign in again." };

  const isKeeper = current.role === "goalkeeper";
  const text = (k: string) => String(formData.get(k) ?? "").trim();

  const displayName = text("displayName");
  const city = text("city");
  const bio = text("bio");
  const level = text("level");
  const teamName = text("teamName");
  const experienceRaw = text("experienceYears");
  const ageRange = text("ageRange");
  const avatarUrl = text("avatarUrl");
  const playerKind = text("playerKind") as PlayerKind;

  const fieldErrors: NonNullable<ProfileActionState["fieldErrors"]> = {};
  if (!displayName) fieldErrors.displayName = "Enter your name.";
  if (!isAvailableCity(city)) fieldErrors.city = "Choose one of the available cities.";
  if (bio.length > BIO_MAX) fieldErrors.bio = `Keep it under ${BIO_MAX} characters.`;
  if (isKeeper && bio.length < KEEPER_BIO_MIN) {
    fieldErrors.bio = `Write at least ${KEEPER_BIO_MIN} characters so teams know who they are booking.`;
  }
  if (!isKeeper && !PLAYER_KINDS.includes(playerKind)) fieldErrors.playerKind = "Choose one option.";
  // Un equipo necesita nombre; un jugador suelto puede dejarlo vacío.
  if (playerKind === "team" && !teamName) fieldErrors.teamName = "Enter your team name.";

  let experienceYears: number | null = null;
  if (isKeeper && experienceRaw !== "") {
    experienceYears = Number(experienceRaw);
    if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60) {
      fieldErrors.experienceYears = "Enter a whole number between 0 and 60.";
    }
  }
  if (isKeeper && !avatarUrl) fieldErrors.avatarUrl = "Add a photo so teams can recognise you.";
  if (isKeeper && !isAgeRange(ageRange)) fieldErrors.ageRange = "Choose your age range.";

  // La URL solo se acepta si apunta a la carpeta propia del bucket de avatares:
  // evita guardar enlaces externos arbitrarios como foto de perfil.
  const ownFolder = `/storage/v1/object/public/avatars/${user.id}/`;
  if (avatarUrl && !avatarUrl.includes(ownFolder)) {
    fieldErrors.avatarUrl = "That photo could not be verified. Upload it again.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Check the highlighted fields.", fieldErrors };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      city,
      bio: bio || null,
      level: (LEVELS as readonly string[]).includes(level) ? level : null,
      experience_years: experienceYears,
      ...(isKeeper ? { age_range: ageRange } : {}),
      avatar_url: avatarUrl || null,
      ...(isKeeper ? {} : { player_kind: playerKind }),
    })
    .eq("id", user.id);

  if (profileError) {
    console.error("saveProfileAction: profiles update failed", profileError);
    return { error: "We couldn't save your profile. Please try again." };
  }

  if (playerKind === "team" && teamName) {
    const { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { error: teamError } = team
      ? await supabase.from("teams").update({ name: teamName }).eq("id", team.id)
      : await supabase.from("teams").insert({ owner_id: user.id, name: teamName });

    if (teamError) {
      console.error("saveProfileAction: team save failed", teamError);
      return { error: "We saved your profile but not your team name. Please try again." };
    }
  }

  redirect("/dashboard");
}
