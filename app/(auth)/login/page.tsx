import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/platform/auth-shell";
import { LoginForm } from "@/components/platform/login-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await searchParams;
  if (user && error !== "profile") redirect("/dashboard");

  return (
    <AuthShell aside="login">
      <LoginForm
        notice={
          error === "auth"
            ? "That link has expired or was already used. Log in, or request a new one."
            : error === "profile"
              ? "Your email was verified, but we couldn't load your profile. Please try logging in again."
              : undefined
        }
      />
    </AuthShell>
  );
}
