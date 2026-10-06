"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/app/toast";
import { waiveStrikeAction } from "@/lib/actions/admin-strikes";

/** Anula un strike pidiendo el motivo, que queda guardado. */
export function WaiveStrikeButton({ strikeId }: { strikeId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function waive() {
    const reason = window.prompt("Why is this strike being cancelled? (it is saved with the strike)");
    if (reason === null) return;
    startTransition(async () => {
      const res = await waiveStrikeAction(strikeId, reason);
      if (res.error) {
        toast(res.error, "error");
        return;
      }
      toast(res.message ?? "Done.");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={waive}
      className="inline-flex min-h-11 items-center rounded-[var(--r-md)] border border-line-strong px-3 text-xs font-semibold text-fg disabled:opacity-50"
    >
      Cancel strike
    </button>
  );
}
