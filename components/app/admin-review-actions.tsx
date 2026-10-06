"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/app/toast";
import { resolveReviewAction, type ReviewDecision } from "@/lib/actions/admin-payments";

const base =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--r-md)] px-4 text-sm font-semibold transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-50";

/** Decisiones del admin sobre una reserva en revisión. Cada una pide confirmación del navegador. */
export function ReviewActions({ bookingId }: { bookingId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function decide(decision: ReviewDecision, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    startTransition(async () => {
      const res = await resolveReviewAction(bookingId, decision);
      if (res.error) {
        toast(res.error, "error");
        return;
      }
      toast(res.message ?? "Done.");
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => decide("release", "Pay the keeper in full? The team will not be refunded.")}
        className={`${base} bg-accent text-accent-ink`}
      >
        Pay the keeper
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => decide("refund", "Refund the team in full? The keeper will not be paid.")}
        className={`${base} border border-line-strong text-fg`}
      >
        Refund the team
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => decide("refund_strike", "Refund the team in full AND add a no-show strike to the keeper?")}
        className={`${base} border border-danger/50 text-danger`}
      >
        Refund and strike keeper
      </button>
    </div>
  );
}
