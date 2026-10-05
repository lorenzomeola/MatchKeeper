"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdminActionState = { error: string | null; done?: boolean };

export async function setKeeperApprovalAction(profileId: string, approved: boolean): Promise<AdminActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_keeper_approval", { p_profile: profileId, p_approved: approved });
  if (error) {
    console.error("setKeeperApprovalAction failed", error);
    return { error: "We couldn't update this keeper. Check that db/admin.sql has been applied." };
  }
  revalidatePath("/admin", "layout");
  return { error: null, done: true };
}

export async function setReportStatusAction(
  reportId: string,
  status: "open" | "reviewed" | "dismissed",
): Promise<AdminActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
  if (error) {
    console.error("setReportStatusAction failed", error);
    return { error: "We couldn't update this report. Check that db/admin.sql has been applied." };
  }
  revalidatePath("/admin", "layout");
  return { error: null, done: true };
}
