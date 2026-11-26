"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminRemoveClipAction, reportClipAction } from "@/lib/actions/keeper-videos";

const LINK = "inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 disabled:opacity-60";

export function ReportClipButton({ path }: { path: string }) {
  const [step, setStep] = useState<"idle" | "confirm" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (step === "sent") return <p className="px-3 py-2 text-[13px] text-muted">Thanks. The MatchKeeper team will review this clip.</p>;

  return (
    <div className="flex flex-wrap items-center gap-x-4 px-3 py-1">
      {step === "idle" ? (
        <button type="button" onClick={() => setStep("confirm")} className={`${LINK} text-muted`}>
          Report clip
        </button>
      ) : (
        <>
          <span className="text-[13px] text-fg-2">Report as inappropriate?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await reportClipAction(path);
                if (r.error) setError(r.error);
                else setStep("sent");
              })
            }
            className={`${LINK} text-danger`}
          >
            {pending ? "Sending…" : "Report"}
          </button>
          <button type="button" onClick={() => setStep("idle")} className={`${LINK} text-muted`}>
            Cancel
          </button>
        </>
      )}
      {error && <p role="alert" className="w-full text-[13px] text-danger">{error}</p>}
    </div>
  );
}

export function RemoveClipButton({ path }: { path: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-x-4 px-3 py-1">
      {!confirm ? (
        <button type="button" onClick={() => setConfirm(true)} className={`${LINK} text-danger`}>
          Remove clip
        </button>
      ) : (
        <>
          <span className="text-[13px] text-fg-2">Delete this clip for good?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await adminRemoveClipAction(path);
                if (r.error) setError(r.error);
                else router.refresh();
              })
            }
            className={`${LINK} text-danger`}
          >
            {pending ? "Removing…" : "Delete"}
          </button>
          <button type="button" onClick={() => setConfirm(false)} className={`${LINK} text-muted`}>
            Cancel
          </button>
        </>
      )}
      {error && <p role="alert" className="w-full text-[13px] text-danger">{error}</p>}
    </div>
  );
}
