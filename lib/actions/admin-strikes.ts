"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { LifecycleState } from "./booking-lifecycle";

const REASON_MAX = 300;

/** Un admin anula un strike (error, lesión, campo cerrado): deja de contar y el portero se reactiva si baja de 3 puntos. */
export async function waiveStrikeAction(strikeId: string, reason: string): Promise<LifecycleState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { error: "Not authorized." };

  const text = reason.trim();
  if (text.length < 3) return { error: "Write a short reason." };
  if (text.length > REASON_MAX) return { error: `Keep the reason under ${REASON_MAX} characters.` };

  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("strikes")
    .update({ waived_at: new Date().toISOString(), waived_by: user.id, waived_reason: text })
    .eq("id", strikeId)
    .is("waived_at", null)
    .select("id, booking_id, goalkeeper_id");
  const strike = updated?.[0];
  if (!strike) return { error: "This strike was already cancelled or does not exist." };

  if (strike.booking_id) {
    await admin
      .from("booking_events")
      .insert({ booking_id: strike.booking_id, type: "strike_waived", actor_id: user.id, data: { strike: strikeId, reason: text } });
  }

  revalidatePath("/admin/strikes");
  return { error: null, done: true, message: "Strike cancelled." };
}
