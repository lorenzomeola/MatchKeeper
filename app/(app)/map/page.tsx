import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExploreMap } from "@/components/app/explore-map";
import { loadExplore } from "@/lib/data/explore";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Map", robots: { index: false } };

export default async function MapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role, approved").eq("id", user.id).maybeSingle();
  const isKeeper = me?.role === "goalkeeper";
  const matches = await loadExplore(user.id, isKeeper);

  return <ExploreMap matches={matches} isKeeper={isKeeper} approved={me?.approved === true} />;
}
