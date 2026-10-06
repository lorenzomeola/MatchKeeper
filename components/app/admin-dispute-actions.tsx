"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/app/toast";
import {
  acceptDisputeAction,
  regenerateEvidenceAction,
  setDisputeFaultAction,
  submitDisputeEvidenceAction,
  waiveDebtAction,
} from "@/lib/actions/admin-disputes";
import type { DisputeFault } from "@/lib/payments/disputes";
import type { LifecycleState } from "@/lib/actions/booking-lifecycle";

const base = "inline-flex min-h-11 items-center justify-center rounded-[var(--r-md)] px-3 text-xs font-semibold disabled:opacity-50";
const FAULT_LABEL: Record<DisputeFault, string> = { keeper: "Keeper's fault", platform: "MatchKeeper's", unclear: "Unclear" };

function useRunner() {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function run(action: () => Promise<LifecycleState>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      const res = await action();
      if (res.error) {
        toast(res.error, "error");
        return;
      }
      toast(res.message ?? "Done.");
      router.refresh();
    });
  }
  return { run, pending };
}

/** Decisiones del admin sobre una disputa: quién la asume, enviar la evidencia o aceptarla. */
export function DisputeActions({
  disputeId,
  fault,
  canRespond,
  hasEvidence,
}: {
  disputeId: string;
  fault: string | null;
  canRespond: boolean;
  hasEvidence: boolean;
}) {
  const { run, pending } = useRunner();

  return (
    <div className="mt-3 grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted">Who bears it:</span>
        {(Object.keys(FAULT_LABEL) as DisputeFault[]).map((f) => (
          <button
            key={f}
            type="button"
            disabled={pending || fault === f}
            onClick={() =>
              run(
                () => setDisputeFaultAction(disputeId, f),
                f === "keeper"
                  ? "Recover this amount from the keeper? We will try to reverse their payout, and if that is not possible it becomes a debt deducted from their next payouts."
                  : undefined,
              )
            }
            className={`${base} ${fault === f ? "bg-accent text-accent-ink" : "border border-line-strong text-fg"}`}
          >
            {FAULT_LABEL[f]}
          </button>
        ))}
      </div>

      {canRespond && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !hasEvidence}
            onClick={() => run(() => submitDisputeEvidenceAction(disputeId), "Send this evidence to Stripe? It can only be sent once.")}
            className={`${base} bg-accent text-accent-ink`}
          >
            Send evidence to Stripe
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => regenerateEvidenceAction(disputeId))}
            className={`${base} border border-line-strong text-fg`}
          >
            Prepare evidence again
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => acceptDisputeAction(disputeId), "Accept the dispute without responding? The bank keeps the money.")}
            className={`${base} border border-danger/50 text-danger`}
          >
            Accept without responding
          </button>
        </div>
      )}
    </div>
  );
}

export function WaiveDebtButton({ debtId }: { debtId: string }) {
  const { run, pending } = useRunner();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const reason = window.prompt("Why is this debt being cancelled? (it is saved)");
        if (reason !== null) run(() => waiveDebtAction(debtId, reason));
      }}
      className={`${base} border border-line-strong text-fg`}
    >
      Cancel debt
    </button>
  );
}
