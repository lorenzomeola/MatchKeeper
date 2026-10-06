"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { londonLocalToIso } from "@/lib/format";
import { FORMATS, NOTES_MAX, SURFACES, isLevel } from "@/lib/match-options";
import { AGE_RANGES, isAgeRange } from "@/lib/profile";

export type MatchActionState = {
  error: string | null;
  fieldErrors?: Partial<
    Record<"date" | "startTime" | "endTime" | "address" | "format" | "surface" | "budget" | "notes" | "prefAgeMax", string>
  >;
};

export async function createMatchAction(
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const text = (k: string) => String(formData.get(k) ?? "").trim();
  const date = text("date");
  const startTime = text("startTime");
  const endTime = text("endTime");
  const address = text("address");
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const format = Number(text("format"));
  const surface = text("surface");
  const level = text("level");
  const budgetRaw = text("budget");
  const notes = text("notes");
  const prefAgeMin = text("prefAgeMin");
  const prefAgeMax = text("prefAgeMax");

  const fe: NonNullable<MatchActionState["fieldErrors"]> = {};
  if (!date) fe.date = "Pick a date.";
  if (!startTime) fe.startTime = "Pick a start time.";
  if (!endTime) fe.endTime = "Pick an end time.";
  if (!address) fe.address = "Add the pitch name or address.";
  if (!FORMATS.includes(format as (typeof FORMATS)[number])) fe.format = "Choose the format.";
  if (!(SURFACES as readonly string[]).includes(surface)) fe.surface = "Choose the surface.";
  if (notes.length > NOTES_MAX) fe.notes = `Keep it under ${NOTES_MAX} characters.`;
  const ageIndex = (v: string) => AGE_RANGES.findIndex((a) => a.value === v);
  if ((prefAgeMin && !isAgeRange(prefAgeMin)) || (prefAgeMax && !isAgeRange(prefAgeMax))) {
    fe.prefAgeMax = "Choose an age range from the list.";
  } else if (prefAgeMin && prefAgeMax && ageIndex(prefAgeMin) > ageIndex(prefAgeMax)) {
    fe.prefAgeMax = "The upper age can't be below the lower age.";
  }

  let budget: number | null = null;
  if (budgetRaw) {
    budget = Number(budgetRaw);
    if (Number.isNaN(budget) || budget < 0 || budget > 1000) fe.budget = "Enter an amount between £0 and £1,000.";
  }

  const startsIso = date && startTime ? londonLocalToIso(`${date}T${startTime}`) : null;
  const endsIso = date && endTime ? londonLocalToIso(`${date}T${endTime}`) : null;
  if (startsIso && endsIso) {
    if (Date.parse(endsIso) <= Date.parse(startsIso)) fe.endTime = "The end time must be after the start.";
    else if (Date.parse(startsIso) < Date.now()) fe.date = "That time has already passed.";
  }

  if (Number.isNaN(lat) || Number.isNaN(lng)) return { error: "Set the pitch location on the map.", fieldErrors: fe };
  if (Object.keys(fe).length > 0) return { error: "Check the highlighted fields.", fieldErrors: fe };

  // Si el jugador tiene equipo, el partido se publica a su nombre.
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("matches")
    .insert({
      created_by: user.id,
      team_id: team?.id ?? null,
      starts_at: startsIso,
      ends_at: endsIso,
      address,
      lat,
      lng,
      format,
      surface,
      level: isLevel(level) ? level : null,
      budget_suggested: budget,
      pref_age_min: prefAgeMin || null,
      pref_age_max: prefAgeMax || null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("createMatchAction failed", error);
    return { error: "We couldn't post your match. Please try again." };
  }

  redirect(`/matches/${created.id}?posted=1`);
}
