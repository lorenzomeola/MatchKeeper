import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MonthCalendar } from "@/components/app/month-calendar";
import { PageHeader } from "@/components/app/page-header";
import { loadCalendarEvents } from "@/lib/data/calendar";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Calendar", robots: { index: false } };

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role, player_kind").eq("id", user.id).maybeSingle();
  const isKeeper = me?.role === "goalkeeper";
  const events = await loadCalendarEvents(user.id, isKeeper);

  return (
    <>
      <PageHeader
        eyebrow={isKeeper ? "Goalkeeper" : me?.player_kind === "team" ? "Team" : "Player"}
        title="Calendar"
        description={isKeeper ? "Your games and the applications still waiting for a reply." : "Your matches by day, with the keeper booked for each."}
      />
      <MonthCalendar events={events} isKeeper={isKeeper} />
    </>
  );
}
