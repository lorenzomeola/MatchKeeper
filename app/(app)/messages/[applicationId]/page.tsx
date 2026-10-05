import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ChatThread } from "@/components/app/chat-thread";
import { loadThread } from "@/lib/data/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };

export default async function ThreadPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const thread = await loadThread(applicationId, user.id);
  if (!thread) notFound();

  return <ChatThread thread={thread} userId={user.id} />;
}
