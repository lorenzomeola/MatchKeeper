import { redirect } from "next/navigation";
import { ConversationList } from "@/components/app/conversation-list";
import { loadConversations } from "@/lib/data/messages";
import { loadSupportSummary } from "@/lib/data/support";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [conversations, support] = await Promise.all([loadConversations(user.id), loadSupportSummary(user.id)]);

  return (
    <div className="lg:grid lg:h-[calc(100dvh-3rem)] lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-6">
      <ConversationList conversations={conversations} support={support} />
      {children}
    </div>
  );
}
