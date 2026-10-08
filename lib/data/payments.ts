import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildKeeperHistory,
  buildTeamHistory,
  keeperSummary,
  teamSummary,
  type HistoryBooking,
} from "@/lib/payments/history";

type Client = Awaited<ReturnType<typeof createClient>>;

const COLUMNS =
  "id, match_id, status, payment_status, rate_pence, platform_fee_pence, total_pence, keeper_payout_pence, commission_pct, cancellation_charge_pct, cancelled_by, cancelled_at, released_at, auto_release_at, keeper_checked_in_at, created_at, player_id, goalkeeper_id, matches(starts_at, ends_at, address)";

type Row = HistoryBooking & { player_id: string; goalkeeper_id: string };

// Se filtra por usuario aquí además de por RLS: este cargador nunca devuelve reservas de otra persona.
async function loadRows(supabase: Client, userId: string, side: "player_id" | "goalkeeper_id") {
  const { data } = await supabase
    .from("bookings")
    .select(COLUMNS)
    .eq(side, userId)
    .neq("status", "pending_payment")
    .not("stripe_charge_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as unknown as Row[];
}

async function namesOf(supabase: Client, ids: string[]) {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", ids);
  for (const p of data ?? []) map.set(p.id, p.display_name);
  return map;
}

/** El portero ve su propia fila (RLS). Si la columna aún no existe en la base de datos, simplemente no hay aviso. */
export async function loadPayoutProblem(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("keeper_stripe_accounts")
    .select("payout_failed_at, payout_failure")
    .eq("profile_id", userId)
    .maybeSingle();
  return data?.payout_failed_at ? { message: (data.payout_failure as string | null) ?? null } : null;
}

export async function loadTeamPayments(supabase: Client, userId: string) {
  const now = new Date();
  const rows = await loadRows(supabase, userId, "player_id");
  const keeperNames = await namesOf(supabase, [...new Set(rows.map((r) => r.goalkeeper_id))]);
  const entries = buildTeamHistory(rows, now);
  const keeperOf = new Map(rows.map((r) => [r.id, keeperNames.get(r.goalkeeper_id) ?? "Keeper"]));
  return { entries, keeperOf, summary: teamSummary(entries, now) };
}

export async function loadKeeperPayments(supabase: Client, userId: string) {
  const now = new Date();
  const rows = await loadRows(supabase, userId, "goalkeeper_id");

  // Los descuentos por deuda solo los lee un admin: se sirven desde el servidor, filtrados por este portero.
  const { data: deductions } = await createAdminClient()
    .from("keeper_debt_deductions")
    .select("booking_id, amount_pence, keeper_debts!inner(goalkeeper_id)")
    .eq("keeper_debts.goalkeeper_id", userId);
  const debtByBooking = new Map<string, number>();
  for (const d of deductions ?? []) {
    debtByBooking.set(d.booking_id, (debtByBooking.get(d.booking_id) ?? 0) + d.amount_pence);
  }

  const playerIds = [...new Set(rows.map((r) => r.player_id))];
  const [players, { data: teams }, { data: strikes }] = await Promise.all([
    namesOf(supabase, playerIds),
    playerIds.length
      ? supabase.from("teams").select("owner_id, name").in("owner_id", playerIds).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { owner_id: string; name: string }[] }),
    supabase.from("strikes").select("booking_id").eq("goalkeeper_id", userId).is("waived_at", null),
  ]);
  const struck = new Set((strikes ?? []).flatMap((s) => (s.booking_id ? [s.booking_id as string] : [])));
  const teamName = new Map<string, string>();
  for (const t of teams ?? []) if (!teamName.has(t.owner_id)) teamName.set(t.owner_id, t.name);
  const teamOf = new Map(rows.map((r) => [r.id, teamName.get(r.player_id) ?? players.get(r.player_id) ?? "A team"]));

  const entries = buildKeeperHistory(rows, debtByBooking, struck, now);
  return { entries, teamOf, summary: keeperSummary(entries, now) };
}
