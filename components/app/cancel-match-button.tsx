"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/app/sheet";
import { useToast } from "@/components/app/toast";
import { cancelMatchAction } from "@/lib/actions/matches";

/** Cancela un partido abierto con confirmación: no se borra, queda en el historial como cancelado. */
export function CancelMatchButton({ matchId, pitch, applicants }: { matchId: string; pitch: string; applicants: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const res = await cancelMatchAction(matchId);
      if (res.error) {
        toast(res.error, "error");
        return;
      }
      setOpen(false);
      toast("Match cancelled. It stays in your history.");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center text-sm font-medium text-danger underline-offset-4 hover:underline"
      >
        Cancel match
      </button>

      <Sheet open={open} title="Cancel this match?" onClose={() => !pending && setOpen(false)}>
        <div className="grid gap-4">
          <p className="pl-prose text-[15px]">
            {pitch} will be marked as cancelled. It stays in your history under Past, but it can&apos;t be reopened: post a
            new match if plans change.
          </p>
          <p className="text-sm text-muted">
            {applicants > 0
              ? `${applicants} ${applicants === 1 ? "keeper has" : "keepers have"} applied. ${applicants === 1 ? "They get" : "They all get"} an email that the match was cancelled.`
              : "No keeper has applied yet, so nobody needs to be told."}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] border border-line-strong px-5 text-[15px] font-medium text-fg transition-colors duration-200 hover:border-accent disabled:opacity-50"
            >
              Keep the match
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirm}
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] bg-danger px-5 text-[15px] font-semibold text-white transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {pending ? "Cancelling…" : "Yes, cancel match"}
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
