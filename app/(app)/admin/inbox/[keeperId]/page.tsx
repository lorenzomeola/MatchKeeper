import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/app/avatar";
import { StatusBadge } from "@/components/app/status-badge";
import { SupportChat } from "@/components/app/support-chat";
import { ArrowLeftIcon } from "@/components/platform/icons";
import { profileRating, type AdminProfile } from "@/lib/data/admin";
import { loadOpenMatchOptions, loadSupportMessages } from "@/lib/data/support";
import { firstName } from "@/lib/format";
import { appUrl } from "@/lib/payments/app-url";
import { createClient } from "@/lib/supabase/server";
import { missingPhrase, openMatchesPhrase } from "@/lib/support-templates";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminSupportThreadPage({ params }: { params: Promise<{ keeperId: string }> }) {
  const { keeperId } = await params;
  if (!UUID.test(keeperId)) notFound();

  // El layout de /admin ya comprobó que es admin; RLS deja leer el perfil y el hilo solo a admins.
  const supabase = await createClient();
  const { data: keeper } = await supabase.from("profiles").select("*").eq("id", keeperId).eq("role", "goalkeeper").maybeSingle();
  if (!keeper) notFound();
  const p = keeper as AdminProfile;

  const origin = appUrl();
  const [{ messages, keeperReadAt }, open] = await Promise.all([loadSupportMessages(keeperId), loadOpenMatchOptions(origin)]);

  return (
    <SupportChat
      key={keeperId}
      keeperId={keeperId}
      viewer="admin"
      initialMessages={messages}
      seenAt={keeperReadAt}
      origin={origin}
      className="pl-surface flex h-[calc(100dvh-12rem)] min-h-[26rem] flex-col overflow-hidden rounded-[var(--r-xl)] lg:h-[calc(100dvh-6rem)]"
      templates={{
        vars: {
          name: firstName(p.display_name),
          missing: missingPhrase(profileRating(p).requiredMissing.map((i) => i.label)),
          profileLink: `${origin}/profile`,
          browseLink: `${origin}/map`,
          openMatches: openMatchesPhrase(open.count),
        },
        urgentMatches: open.options,
      }}
      header={
        <header className="flex items-center gap-3 border-b border-line px-3 py-3 lg:px-5">
          <Link
            href="/admin/inbox"
            aria-label="Back to inbox"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-fg-2 transition-colors duration-200 hover:text-fg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <Avatar name={p.display_name} src={p.avatar_url} size="md" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
              <span className="truncate">{p.display_name}</span>
              <StatusBadge tone={p.approved ? "success" : "warning"}>{p.approved ? "Approved" : "In review"}</StatusBadge>
            </p>
            <Link href={`/admin/users/${p.id}`} className="text-xs text-muted underline-offset-4 hover:underline">
              Open profile
            </Link>
          </div>
        </header>
      }
    />
  );
}
