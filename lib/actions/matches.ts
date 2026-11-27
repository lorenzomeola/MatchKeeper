"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { londonLocalToIso } from "@/lib/format";
import { FORMATS, NOTES_MAX, SURFACES, isLevel } from "@/lib/match-options";
import { isDuration } from "@/lib/pricing";
import { isKeepersNeeded } from "@/lib/slots";
import { AGE_RANGES, isAgeRange } from "@/lib/profile";
import { isSamePlace } from "@/lib/match-duplicates";
import { diffMatch, updateKind, type MatchSnapshot } from "@/lib/match-changes";
import { defer } from "@/lib/email/booking-emails";
import { notifyMatchUpdated } from "@/lib/email/match-updates";

export type MatchActionState = {
  error: string | null;
  /** Partido abierto que ya cubre esta hora y lugar, para enlazarlo desde el formulario. */
  duplicateMatchId?: string;
  fieldErrors?: Partial<
    Record<"date" | "startTime" | "duration" | "address" | "format" | "surface" | "keepers" | "budget" | "notes" | "prefAgeMax", string>
  >;
};

type ParsedMatch = {
  startsIso: string;
  endsIso: string;
  address: string;
  lat: number;
  lng: number;
  format: number;
  surface: string;
  keepersNeeded: number;
  level: string | null;
  budget: number | null;
  prefAgeMin: string | null;
  prefAgeMax: string | null;
  notes: string | null;
};

function parseMatchForm(formData: FormData): { ok: true; v: ParsedMatch } | { ok: false; state: MatchActionState } {
  const text = (k: string) => String(formData.get(k) ?? "").trim();
  const date = text("date");
  const startTime = text("startTime");
  const duration = Number(text("duration"));
  const address = text("address");
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const format = Number(text("format"));
  const surface = text("surface");
  const keepersNeeded = Number(text("keepers") || "1");
  const level = text("level");
  const budgetRaw = text("budget");
  const notes = text("notes");
  const prefAgeMin = text("prefAgeMin");
  const prefAgeMax = text("prefAgeMax");

  const fe: NonNullable<MatchActionState["fieldErrors"]> = {};
  if (!date) fe.date = "Pick a date.";
  if (!startTime) fe.startTime = "Pick a start time.";
  if (!isDuration(duration)) fe.duration = "Choose 1, 1.5 or 2 hours.";
  if (!address) fe.address = "Add the pitch name or address.";
  if (!FORMATS.includes(format as (typeof FORMATS)[number])) fe.format = "Choose the format.";
  if (!(SURFACES as readonly string[]).includes(surface)) fe.surface = "Choose the surface.";
  if (!isKeepersNeeded(keepersNeeded)) fe.keepers = "Choose 1 or 2 keepers.";
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
  const endsIso = startsIso && isDuration(duration) ? new Date(Date.parse(startsIso) + duration * 60_000).toISOString() : null;
  if (startsIso && Date.parse(startsIso) < Date.now()) fe.date = "That time has already passed.";

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, state: { error: "Set the pitch location on the map.", fieldErrors: fe } };
  }
  if (Object.keys(fe).length > 0 || !startsIso || !endsIso) {
    return { ok: false, state: { error: "Check the highlighted fields.", fieldErrors: fe } };
  }

  return {
    ok: true,
    v: {
      startsIso,
      endsIso,
      address,
      lat,
      lng,
      format,
      surface,
      keepersNeeded,
      level: isLevel(level) ? level : null,
      budget,
      prefAgeMin: prefAgeMin || null,
      prefAgeMax: prefAgeMax || null,
      notes: notes || null,
    },
  };
}

export async function createMatchAction(
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const parsed = parseMatchForm(formData);
  if (!parsed.ok) return parsed.state;
  const { startsIso, endsIso, address, lat, lng, format, surface, keepersNeeded, level, budget, prefAgeMin, prefAgeMax, notes } = parsed.v;
  const text = (k: string) => String(formData.get(k) ?? "").trim();

  // Puede tener varios partidos abiertos, pero no el mismo dos veces: mismo usuario, hora y lugar.
  // Si lo que quiere es cambiar el partido (p. ej. subir el presupuesto), puede cancelar el anterior y publicar este.
  const { data: sameTime } = await supabase
    .from("matches")
    .select("id, address, lat, lng")
    .eq("created_by", user.id)
    .eq("status", "open")
    .eq("starts_at", startsIso);
  const duplicates = (sameTime ?? []).filter((m) => isSamePlace(m, { address, lat, lng }));
  if (duplicates.length > 0) {
    if (text("replaceMatchId") !== duplicates[0].id) {
      return {
        error: "You already have an open match at this pitch and time.",
        duplicateMatchId: duplicates[0].id,
      };
    }
    for (const d of duplicates) {
      const { error: cancelError } = await supabase.rpc("cancel_open_match", { p_match_id: d.id });
      if (cancelError) {
        console.error("cancel_open_match failed", cancelError);
        return {
          error: cancelError.message.includes("booked keeper")
            ? "The earlier match already has a keeper booked, so it can't be replaced."
            : "We couldn't cancel the earlier match. Please try again.",
        };
      }
    }
  }

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
      // category: la pone un trigger con la del perfil que publica.
      level,
      budget_suggested: budget,
      keepers_needed: keepersNeeded,
      pref_age_min: prefAgeMin,
      pref_age_max: prefAgeMax,
      notes,
    })
    .select("id")
    .single();

  // 23505: el índice único de db/duplicate-matches.sql frena el doble envío simultáneo.
  if (error?.code === "23505") {
    return { error: "You already have an open match at this pitch and time." };
  }
  if (error || !created) {
    console.error("createMatchAction failed", error);
    return { error: "We couldn't post your match. Please try again." };
  }

  redirect(`/matches/${created.id}?posted=1`);
}

/** Edita un partido abierto propio. Con un portero reservado solo cambian las notas. */
export async function updateMatchAction(
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const matchId = String(formData.get("matchId") ?? "");
  const { data: before } = await supabase.from("matches").select("*").eq("id", matchId).eq("created_by", user.id).maybeSingle();
  if (!before || before.status !== "open" || Date.parse(before.ends_at) <= Date.now()) {
    return { error: "This match can't be edited any more." };
  }

  const { count: booked } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .neq("status", "cancelled");

  let v: ParsedMatch;
  if ((booked ?? 0) > 0) {
    const notes = String(formData.get("notes") ?? "").trim();
    if (notes.length > NOTES_MAX) return { error: "Check the highlighted fields.", fieldErrors: { notes: `Keep it under ${NOTES_MAX} characters.` } };
    v = {
      startsIso: before.starts_at,
      endsIso: before.ends_at,
      address: before.address,
      lat: before.lat,
      lng: before.lng,
      format: before.format,
      surface: before.surface,
      keepersNeeded: before.keepers_needed,
      level: before.level,
      budget: before.budget_suggested == null ? null : Number(before.budget_suggested),
      prefAgeMin: before.pref_age_min,
      prefAgeMax: before.pref_age_max,
      notes: notes || null,
    };
  } else {
    const parsed = parseMatchForm(formData);
    if (!parsed.ok) return parsed.state;
    v = parsed.v;

    const { data: sameTime } = await supabase
      .from("matches")
      .select("id, address, lat, lng")
      .eq("created_by", user.id)
      .eq("status", "open")
      .eq("starts_at", v.startsIso)
      .neq("id", matchId);
    const duplicate = (sameTime ?? []).find((m) => isSamePlace(m, v));
    if (duplicate) {
      return { error: "You already have another open match at this pitch and time.", duplicateMatchId: duplicate.id };
    }
  }

  const { data: changed, error } = await supabase.rpc("update_open_match", {
    p_match_id: matchId,
    p_starts_at: v.startsIso,
    p_ends_at: v.endsIso,
    p_address: v.address,
    p_lat: v.lat,
    p_lng: v.lng,
    p_format: v.format,
    p_surface: v.surface,
    p_level: v.level,
    p_budget: v.budget,
    p_keepers: v.keepersNeeded,
    p_age_min: v.prefAgeMin,
    p_age_max: v.prefAgeMax,
    p_notes: v.notes,
  });
  if (error) {
    if (error.code === "23505") return { error: "You already have another open match at this pitch and time." };
    if (error.message.includes("already booked")) return { error: "A keeper has just been booked, so only the notes can be edited now." };
    console.error("updateMatchAction failed", error);
    return { error: "We couldn't save your changes. Please try again." };
  }

  if (changed === true) {
    const after: MatchSnapshot = {
      starts_at: v.startsIso,
      ends_at: v.endsIso,
      address: v.address,
      lat: v.lat,
      lng: v.lng,
      format: v.format,
      surface: v.surface,
      level: v.level,
      budget_suggested: v.budget,
      keepers_needed: v.keepersNeeded,
      pref_age_min: v.prefAgeMin,
      pref_age_max: v.prefAgeMax,
    };
    const changes = diffMatch(before as MatchSnapshot, after);
    if (changes.length > 0) {
      const kind = updateKind(changes, before as MatchSnapshot, after);
      defer(() => notifyMatchUpdated(matchId, changes, kind));
    }
  }

  redirect(`/matches/${matchId}?updated=1`);
}
