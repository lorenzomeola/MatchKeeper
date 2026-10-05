import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();

  if (!me?.is_admin) {
    return (
      <>
        <PageHeader eyebrow="Admin" title="No access" description="This area is only for MatchKeeper admins." />
        <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-strong underline underline-offset-4">
          Back to your home
        </Link>
      </>
    );
  }

  return children;
}
