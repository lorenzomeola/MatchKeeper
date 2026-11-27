import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SupportChat } from "@/components/app/support-chat";
import { LogoMark } from "@/components/logo";
import { ArrowLeftIcon } from "@/components/platform/icons";
import { loadKeeperSupport } from "@/lib/data/support";
import { appUrl } from "@/lib/payments/app-url";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "MatchKeeper team", robots: { index: false } };

export default async function SupportThreadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // El hilo lo abre el equipo de MatchKeeper; sin él no hay nada que mostrar.
  const support = await loadKeeperSupport(user.id);
  if (!support) redirect("/messages");

  return (
    <SupportChat
      keeperId={user.id}
      viewer="keeper"
      initialMessages={support.messages}
      origin={appUrl()}
      className="flex h-dvh flex-col bg-bg lg:h-full lg:overflow-hidden lg:rounded-[var(--r-xl)] lg:border lg:border-line lg:bg-bg-2"
      header={
        <header className="flex items-center gap-3 border-b border-line px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:px-5 lg:pt-4">
          <Link
            href="/messages"
            aria-label="Back to messages"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-fg-2 transition-colors duration-200 hover:text-fg lg:hidden"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft">
            <LogoMark className="h-6 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-fg">MatchKeeper team</p>
            <p className="truncate text-xs text-muted">Questions, ideas and news from the team</p>
          </div>
        </header>
      }
    />
  );
}
