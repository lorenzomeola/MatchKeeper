import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";
import type { NavVariant } from "@/components/app/nav-config";
import { ThemeScope } from "@/components/platform/theme";
import { loadUnreadCount } from "@/lib/data/messages";
import { countNewApplications, hasNewOpenMatches } from "@/lib/data/seen";
import { loadSupportUnread } from "@/lib/data/support";
import { getPaymentMode } from "@/lib/payments/mode";
import { CONTACT_EMAIL } from "@/lib/site";

// Sin viewport-fit=cover: con él, iOS Safari ancla la barra fija inferior bajo su propia barra de herramientas y queda oculta al hacer scroll hacia arriba.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0c0b" },
    { media: "(prefers-color-scheme: light)", color: "#faf7f3" },
  ],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // "*" para no romper si una migración reciente aún no se ha aplicado.
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  const isAdmin = profile?.is_admin === true;
  const isKeeper = profile?.role === "goalkeeper";
  const variant: NavVariant = isKeeper ? "goalkeeper" : "player";

  let pending = 0;
  let reports = 0;
  if (isAdmin) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "goalkeeper")
      .eq("approved", false);
    pending = count ?? 0;
    const { count: openReports } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");
    reports = openReports ?? 0;
  }

  const roleLabel = isKeeper ? "Goalkeeper" : profile?.player_kind === "team" ? "Team" : "Player";
  const [unread, supportUnread, newApplications, newMatches, supportThread] = await Promise.all([
    loadUnreadCount(),
    loadSupportUnread(isAdmin),
    isKeeper ? 0 : countNewApplications(user.id),
    isKeeper && profile?.approved ? hasNewOpenMatches(user.id, profile.category ?? null, profile.explore_seen_at ?? null) : false,
    isKeeper ? supabase.from("support_threads").select("keeper_id").eq("keeper_id", user.id).maybeSingle() : null,
  ]);
  // Solo el portero con un hilo abierto por el equipo tiene chat de soporte; el resto escribe por email.
  const supportHref = supportThread?.data ? "/messages/support" : `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("MatchKeeper support")}`;
  const paymentMode = await getPaymentMode();

  return (
    <>
      <ThemeScope>
        <AppShell
          variant={variant}
          isAdmin={isAdmin}
          userId={user.id}
          user={{
            name: profile?.display_name ?? user.email ?? "You",
            avatarUrl: profile?.avatar_url ?? null,
            roleLabel,
          }}
          badges={{
            unread: unread + supportUnread.keeper,
            pending,
            reports,
            support: supportUnread.inbox,
            applications: newApplications,
            explore: newMatches ? 1 : 0,
          }}
          paymentsEnabled={paymentMode === "paid"}
          supportHref={supportHref}
          paymentModeUnavailable={paymentMode === "unavailable"}
        >
          {children}
        </AppShell>
      </ThemeScope>
    </>
  );
}
