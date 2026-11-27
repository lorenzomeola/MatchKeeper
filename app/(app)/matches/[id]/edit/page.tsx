import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { NewMatchForm, type MatchFormInitial } from "@/components/app/new-match-form";
import { PageHeader } from "@/components/app/page-header";
import { ArrowLeftIcon } from "@/components/platform/icons";
import { clockTime, isPast, londonDay } from "@/lib/format";
import { FORMATS, NOTES_MAX, SURFACES, isLevel } from "@/lib/match-options";
import { matchMinutes } from "@/lib/pricing";
import { AGE_RANGES } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit match", robots: { index: false } };

type Params = { format?: string; surface?: string; level?: string; keepers?: string; budget?: string; prefAgeMin?: string; prefAgeMax?: string; notes?: string };

/** Valores que llegan de "Edit my existing match with these details"; solo se aceptan los válidos. */
function overrides(p: Params): Partial<MatchFormInitial> {
  const out: Partial<MatchFormInitial> = {};
  if (p.format && FORMATS.includes(Number(p.format) as (typeof FORMATS)[number])) out.format = p.format;
  if (p.surface && (SURFACES as readonly string[]).includes(p.surface)) out.surface = p.surface;
  if (p.level !== undefined && (p.level === "" || isLevel(p.level))) out.level = p.level;
  if (p.keepers === "1" || p.keepers === "2") out.keepers = p.keepers;
  if (p.budget !== undefined && (p.budget === "" || (Number(p.budget) >= 0 && Number(p.budget) <= 1000))) out.budget = p.budget;
  const ages = AGE_RANGES.map((a) => a.value as string);
  if (p.prefAgeMin !== undefined && (p.prefAgeMin === "" || ages.includes(p.prefAgeMin))) out.prefAgeMin = p.prefAgeMin;
  if (p.prefAgeMax !== undefined && (p.prefAgeMax === "" || ages.includes(p.prefAgeMax))) out.prefAgeMax = p.prefAgeMax;
  if (p.notes !== undefined) out.notes = p.notes.slice(0, NOTES_MAX);
  return out;
}

export default async function EditMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Params>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase.from("matches").select("*").eq("id", id).eq("created_by", user.id).maybeSingle();
  if (!match) notFound();
  if (match.status !== "open" || isPast(match.ends_at)) redirect(`/matches/${id}`);

  const { count: booked } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("match_id", id)
    .neq("status", "cancelled");
  const notesOnly = (booked ?? 0) > 0;

  const initial: MatchFormInitial = {
    date: londonDay(match.starts_at),
    startTime: clockTime(match.starts_at),
    duration: String(matchMinutes(match.starts_at, match.ends_at)),
    address: match.address ?? "",
    format: match.format ? String(match.format) : "",
    surface: match.surface ?? "",
    level: match.level ?? "",
    keepers: String(match.keepers_needed ?? 1),
    budget: match.budget_suggested == null ? "" : String(Number(match.budget_suggested)),
    prefAgeMin: match.pref_age_min ?? "",
    prefAgeMax: match.pref_age_max ?? "",
    notes: match.notes ?? "",
    lat: match.lat,
    lng: match.lng,
    // Los valores de la URL sustituyen a los guardados, salvo el partido bloqueado a solo notas.
    ...(notesOnly ? { notes: overrides(query).notes ?? match.notes ?? "" } : overrides(query)),
  };

  return (
    <>
      <Link
        href={`/matches/${id}`}
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted transition-colors duration-200 hover:text-fg"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to the match
      </Link>
      <PageHeader
        eyebrow="Edit match"
        title="Edit your match"
        description="Change what you need. Your applications stay, and keepers are told about relevant changes."
      />
      <NewMatchForm category={match.category ?? "men"} edit={{ matchId: id, initial, notesOnly }} />
    </>
  );
}
