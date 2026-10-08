import "server-only";
import { longDate, splitAddress, timeRange } from "@/lib/format";
import { appUrl } from "@/lib/payments/app-url";
import { createAdminClient } from "@/lib/supabase/admin";

export type Party = { id: string; email: string | null; name: string };

export type BookingCtx = {
  id: string;
  status: string;
  matchId: string;
  pitch: string;
  when: string;
  startsAt: Date;
  endsAt: Date;
  autoReleaseAt: Date | null;
  ratePence: number;
  feePence: number;
  totalPence: number;
  commissionPct: number;
  team: Party;
  keeper: Party;
  matchUrl: string;
  paymentsUrl: string;
};

async function partyOf(id: string, fallbackName: string, teamName?: string): Promise<Party> {
  const admin = createAdminClient();
  const [{ data: profile }, { data: auth }] = await Promise.all([
    admin.from("profiles").select("display_name").eq("id", id).maybeSingle(),
    admin.auth.admin.getUserById(id),
  ]);
  return { id, email: auth?.user?.email ?? null, name: teamName || profile?.display_name || fallbackName };
}

/** Todo lo que necesitan los emails de una reserva: partido, importes y las dos partes con su correo. */
export async function loadBookingContext(bookingId: string): Promise<BookingCtx | null> {
  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select(
      "id, status, match_id, player_id, goalkeeper_id, rate_pence, platform_fee_pence, total_pence, commission_pct, auto_release_at, matches(address, starts_at, ends_at)",
    )
    .eq("id", bookingId)
    .maybeSingle();
  const match = (b?.matches ?? null) as { address: string | null; starts_at: string; ends_at: string } | null;
  if (!b || !match) return null;

  const { data: team } = await admin
    .from("teams")
    .select("name")
    .eq("owner_id", b.player_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const [teamParty, keeperParty] = await Promise.all([
    partyOf(b.player_id, "The team", team?.name),
    partyOf(b.goalkeeper_id, "The keeper"),
  ]);

  const rate = b.rate_pence ?? 0;
  return {
    id: b.id,
    status: b.status,
    matchId: b.match_id,
    pitch: splitAddress(match.address).name,
    when: `${longDate(match.starts_at)}, ${timeRange(match.starts_at, match.ends_at)}`,
    startsAt: new Date(match.starts_at),
    endsAt: new Date(match.ends_at),
    autoReleaseAt: b.auto_release_at ? new Date(b.auto_release_at) : null,
    ratePence: rate,
    feePence: b.platform_fee_pence ?? 0,
    totalPence: b.total_pence ?? rate,
    commissionPct: Number(b.commission_pct),
    team: teamParty,
    keeper: keeperParty,
    matchUrl: `${appUrl()}/matches/${b.match_id}`,
    paymentsUrl: `${appUrl()}/payments`,
  };
}
