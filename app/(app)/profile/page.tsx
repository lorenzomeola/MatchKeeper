import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { LogOutIcon } from "@/components/platform/icons";
import { signOutAction } from "@/lib/actions/auth";
import { ProfileForm } from "@/components/platform/profile-form";
import { valuesFromRow, type Role } from "@/lib/profile";
import { getOrCreateProfile } from "@/lib/profile-ensure";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your profile", robots: { index: false } };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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

  return (
    <>
      <PageHeader
        eyebrow={role === "goalkeeper" ? "Goalkeeper profile" : profile.player_kind === "team" ? "Team profile" : "Player profile"}
        title="Your profile"
        description={
          role === "goalkeeper"
            ? "This is what teams see when you apply."
            : "This is what keepers see when they look at your matches."
        }
      />
      {role === "goalkeeper" && (
        <Link
          href={`/keepers/${user.id}`}
          className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-accent-strong underline underline-offset-4"
        >
          See how teams view your profile
        </Link>
      )}
      <ProfileForm role={role} userId={user.id} initial={valuesFromRow(profile, teamName)} inShell />

      <form action={signOutAction} className="mt-12 border-t border-line pt-6">
        <button
          type="submit"
          className="inline-flex min-h-12 items-center gap-2 rounded-[var(--r-md)] border border-line-strong px-5 text-[15px] font-medium text-fg-2 transition-colors duration-200 hover:border-accent hover:text-fg"
        >
          <LogOutIcon className="h-5 w-5" />
          Log out
        </button>
      </form>
    </>
  );
}
