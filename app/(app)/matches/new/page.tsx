import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewMatchForm } from "@/components/app/new-match-form";
import { PageHeader } from "@/components/app/page-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Post a match", robots: { index: false } };

export default async function NewMatchPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const initialDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role === "goalkeeper") redirect("/dashboard");

  return (
    <>
      <PageHeader
        eyebrow="New match"
        title="Post a match"
        description="Add the details once. Keepers nearby apply with their own rate and you pick one."
      />
      <NewMatchForm initialDate={initialDate} />
    </>
  );
}
