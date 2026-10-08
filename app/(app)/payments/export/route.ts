import { loadKeeperPayments } from "@/lib/data/payments";
import { KEEPER_STATE, keeperCsv } from "@/lib/payments/history";
import { createClient } from "@/lib/supabase/server";

// CSV mensual de los pagos del propio portero, para su declaración de impuestos.
export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return new Response("Invalid month", { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "goalkeeper") return new Response("Forbidden", { status: 403 });

  const { entries, teamOf } = await loadKeeperPayments(supabase, user.id);
  const rows = entries
    .filter((e) => e.monthKey === month)
    .map((entry) => ({ entry, team: teamOf.get(entry.bookingId) ?? "", statusLabel: KEEPER_STATE[entry.state].label }));

  return new Response(`\uFEFF${keeperCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="matchkeeper-payments-${month}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
