import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEvidence, type EvidenceInput, type EvidencePackage } from "./dispute-evidence";

// Eventos de la reserva que ayudan a contar lo que pasó; el resto (strikes, deudas, disputas) no pertenece a la evidencia.
const EVENT_TYPES = ["released", "moved_to_review", "admin_resolved", "cancelled", "refunded"];

/** Reúne los datos de una reserva para la evidencia: Términos, chat, check-in, confirmaciones y registro de eventos. */
export async function loadEvidenceInput(bookingId: string): Promise<EvidenceInput> {
  const admin = createAdminClient();

  const { data: b } = await admin.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) throw new Error("Booking not found");

  const [{ data: match }, { data: player }, { data: keeper }, { data: messages }, { data: events }, authUser] = await Promise.all([
    admin.from("matches").select("address, starts_at, ends_at").eq("id", b.match_id).maybeSingle(),
    admin.from("profiles").select("display_name").eq("id", b.player_id).maybeSingle(),
    admin.from("profiles").select("display_name, experience_years").eq("id", b.goalkeeper_id).maybeSingle(),
    admin.from("messages").select("created_at, sender_id, body").eq("application_id", b.application_id).order("created_at"),
    admin.from("booking_events").select("type, created_at").eq("booking_id", bookingId).order("created_at"),
    admin.auth.admin.getUserById(b.player_id),
  ]);
  if (!match) throw new Error("Match not found");

  const paid = (events ?? []).find((e) => e.type === "payment_succeeded");

  return {
    bookingId,
    matchAddress: match.address,
    startsAt: new Date(match.starts_at),
    endsAt: new Date(match.ends_at),
    playerName: player?.display_name ?? "The team",
    playerEmail: authUser.data.user?.email ?? null,
    keeperName: keeper?.display_name ?? "The goalkeeper",
    keeperExperienceYears: keeper?.experience_years ?? null,
    ratePence: b.rate_pence ?? 0,
    totalPence: b.total_pence ?? 0,
    termsVersion: b.terms_version,
    termsAcceptedAt: b.terms_accepted_at ? new Date(b.terms_accepted_at) : null,
    paidAt: paid ? new Date(paid.created_at) : b.confirmed_at ? new Date(b.confirmed_at) : null,
    checkedInAt: b.keeper_checked_in_at ? new Date(b.keeper_checked_in_at) : null,
    checkInDistanceM: b.check_in_distance_m,
    teamResponse: b.team_response,
    teamRespondedAt: b.team_responded_at ? new Date(b.team_responded_at) : null,
    teamReportNote: b.team_report_note,
    chat: (messages ?? []).map((m) => ({
      at: new Date(m.created_at),
      from: m.sender_id === b.player_id ? ("team" as const) : ("keeper" as const),
      body: m.body,
    })),
    events: (events ?? []).filter((e) => EVENT_TYPES.includes(e.type)).map((e) => ({ at: new Date(e.created_at), type: e.type })),
  };
}

export async function buildDisputeEvidence(bookingId: string): Promise<EvidencePackage> {
  return formatEvidence(await loadEvidenceInput(bookingId));
}
