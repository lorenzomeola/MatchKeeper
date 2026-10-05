"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/app/sheet";
import { useToast } from "@/components/app/toast";
import { setKeeperApprovalAction, setReportStatusAction } from "@/lib/actions/admin";

/** Aprobar o retirar la aprobación de un portero, con confirmación. */
export function ApprovalControl({
  profileId,
  name,
  approved,
  missing = [],
  compact,
}: {
  profileId: string;
  name: string;
  approved: boolean;
  /** Obligatorios que faltan en el perfil; se avisa antes de aprobar. */
  missing?: string[];
  compact?: boolean;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const res = await setKeeperApprovalAction(profileId, !approved);
      if (res.error) {
        toast(res.error, "error");
        return;
      }
      setOpen(false);
      toast(approved ? `${name} can no longer apply.` : `${name} is approved.`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          approved
            ? `inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] border border-line-strong px-5 text-[15px] font-medium text-fg-2 transition-colors duration-200 hover:border-danger hover:text-danger ${compact ? "" : "w-full"}`
            : `inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-[transform,background-color] duration-150 hover:bg-accent-strong active:scale-[0.98] ${compact ? "" : "w-full"}`
        }
      >
        {approved ? "Revoke approval" : "Approve"}
      </button>

      <Sheet open={open} title={approved ? `Revoke ${name}?` : `Approve ${name}?`} onClose={() => !pending && setOpen(false)}>
        <p className="pl-prose text-[15px]">
          {approved
            ? "They will keep their profile and existing bookings, but they will not be able to apply to new matches."
            : "They will be able to apply to matches and teams will see them."}
        </p>
        {!approved && missing.length > 0 && (
          <p className="mt-3 rounded-[var(--r-md)] bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] px-3 py-2.5 text-[13px] leading-snug text-warning">
            Required items still missing: {missing.join(", ").toLowerCase()}.
          </p>
        )}
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className={`inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] px-5 text-[15px] font-semibold text-accent-ink transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-50 ${approved ? "bg-danger" : "bg-accent"}`}
          >
            {pending ? "Saving…" : approved ? "Revoke" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] px-5 text-[15px] font-medium text-fg-2"
          >
            Cancel
          </button>
        </div>
      </Sheet>
    </>
  );
}

/** Cambia el estado de una denuncia. */
export function ReportActions({ reportId, status }: { reportId: string; status: string }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function set(next: "open" | "reviewed" | "dismissed", message: string) {
    startTransition(async () => {
      const res = await setReportStatusAction(reportId, next);
      toast(res.error ?? message, res.error ? "error" : "success");
    });
  }

  const btn =
    "inline-flex min-h-11 items-center justify-center rounded-[var(--r-md)] border border-line-strong px-4 text-sm font-medium text-fg transition-colors duration-200 hover:border-accent disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-2.5">
      {status === "open" ? (
        <>
          <button type="button" disabled={pending} onClick={() => set("reviewed", "Marked as reviewed.")} className={`${btn} !border-transparent !bg-accent font-semibold !text-accent-ink`}>
            Mark as reviewed
          </button>
          <button type="button" disabled={pending} onClick={() => set("dismissed", "Report dismissed.")} className={btn}>
            Dismiss
          </button>
        </>
      ) : (
        <button type="button" disabled={pending} onClick={() => set("open", "Report reopened.")} className={btn}>
          Reopen
        </button>
      )}
    </div>
  );
}
