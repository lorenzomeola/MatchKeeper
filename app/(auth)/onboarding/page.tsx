import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { FloodlightBackdrop } from "@/components/platform/floodlight-backdrop";
import { ProfileForm } from "@/components/platform/profile-form";
import { ThemeToggle } from "@/components/platform/theme";
import { completeness, profileChecklist, valuesFromRow, type Role } from "@/lib/profile";
import { getOrCreateProfile } from "@/lib/profile-ensure";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false },
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // "*" y no columnas sueltas: si la migración 0003 aún no está aplicada, la página
  // sigue cargando en vez de caer a /signup por un error de columna inexistente.
  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) redirect("/signup");

  const role: Role = profile.role === "goalkeeper" ? "goalkeeper" : "player";

  let teamName = "";
  if (role === "player") {
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    teamName = team?.name ?? "";
  }

  const initial = valuesFromRow(profile, teamName);
  const isComplete = completeness(profileChecklist(role, initial)).requiredMissing.length === 0;

  return (
    <div className="relative min-h-dvh bg-bg text-fg">
      <FloodlightBackdrop />

      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-6 sm:px-8 sm:py-8">
        <Link href="/home" className="pl-focus rounded-[var(--r-sm)]" aria-label="MatchKeeper home">
          <Logo iconClassName="h-8 w-9" wordmarkClassName="text-lg" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-[1000px] px-5 pb-20 pt-4 sm:px-8 sm:pt-10">
        <p className="pl-eyebrow">{role === "goalkeeper" ? "Goalkeeper profile" : "Player profile"}</p>
        <h1 className="pl-display mt-3 text-fg [font-size:var(--t-5xl)]">
          {isComplete ? "Your profile" : role === "goalkeeper" ? "Build your keeper profile" : "Set up your profile"}
        </h1>
        <p className="pl-prose mt-4 max-w-[34rem] [font-size:var(--t-lg)]">
          {role === "goalkeeper"
            ? "Teams choose between keepers. A photo, a real bio and your experience are what they read first."
            : "Tell keepers who they will be playing with. It takes a minute and you can change it later."}
        </p>

        <div className="mt-12">
          <ProfileForm role={role} userId={user.id} initial={initial} />
        </div>
      </main>
    </div>
  );
}
