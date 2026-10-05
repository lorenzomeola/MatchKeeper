import type { Metadata } from "next";
import { ChatIcon } from "@/components/platform/icons";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

// Solo escritorio: en móvil la lista ocupa toda la pantalla.
export default function MessagesIndexPage() {
  return (
    <div className="pl-surface hidden place-items-center rounded-[var(--r-xl)] p-10 text-center lg:grid">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-[var(--r-md)] bg-accent-soft text-accent">
          <ChatIcon className="h-6 w-6" />
        </span>
        <p className="pl-display mt-5 text-fg [font-size:var(--t-xl)]">Pick a conversation</p>
        <p className="pl-prose mx-auto mt-2 max-w-[22rem] text-[15px]">
          Choose one from the list to read it and reply.
        </p>
      </div>
    </div>
  );
}
