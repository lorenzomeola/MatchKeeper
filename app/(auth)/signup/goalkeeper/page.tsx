import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/platform/auth-shell";
import { SignupForm } from "@/components/platform/signup-form";
import { isCategory } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Join as a goalkeeper",
  robots: { index: false },
};

export default async function GoalkeeperSignupPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <AuthShell aside="goalkeeper">
      <SignupForm role="goalkeeper" initialCategory={isCategory(category) ? category : null} />
    </AuthShell>
  );
}
