"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/app/sheet";
import { useToast } from "@/components/app/toast";
import {
  cancelBookingAction,
  checkInAction,
  confirmMatchPlayedAction,
  reportMatchAction,
  type LifecycleState,
} from "@/lib/actions/booking-lifecycle";

const primary =
  "inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-[transform,background-color] duration-150 hover:bg-accent-strong active:scale-[0.98] disabled:opacity-50";
const secondary =
  "inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] border border-line-strong px-5 text-[15px] font-medium text-fg transition-colors duration-200 hover:border-accent disabled:opacity-50";

/** Pide la ubicación al navegador y la envía con el check-in. */
export function CheckInButton({ bookingId }: { bookingId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);

  function checkIn() {
    if (!navigator.geolocation) {
      toast("Your browser can't share its location.", "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        startTransition(async () => {
          const res = await checkInAction(bookingId, pos.coords.latitude, pos.coords.longitude);
          if (res.error) toast(res.error, "error");
          else {
            toast("You are checked in.");
            router.refresh();
          }
        });
      },
      () => {
        setLocating(false);
        toast("Allow location access to check in. If it keeps failing, contact support.", "error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <button type="button" onClick={checkIn} disabled={pending || locating} className={primary}>
      {locating ? "Finding you…" : pending ? "Checking in…" : "I have arrived"}
    </button>
  );
}

/** Confirmar que el portero jugó o reportar un problema. */
export function TeamResponseActions({ bookingId }: { bookingId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"no_show" | "other">("no_show");
  const [note, setNote] = useState("");

  function run(action: () => Promise<LifecycleState>, okMessage: string) {
    startTransition(async () => {
      const res = await action();
      if (res.error) {
        toast(res.error, "error");
        return;
      }
      setOpen(false);
      toast(res.message ?? okMessage);
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => confirmMatchPlayedAction(bookingId), "Thanks. The keeper has been paid.")}
          className={primary}
        >
          {pending ? "Saving…" : "Yes, they played"}
        </button>
        <button type="button" disabled={pending} onClick={() => setOpen(true)} className={secondary}>
          Report a problem
        </button>
      </div>

      <Sheet open={open} title="Report a problem" onClose={() => !pending && setOpen(false)}>
        <div className="grid gap-4">
          <fieldset className="grid gap-2 text-[15px] text-fg-2">
            <label className="flex min-h-11 items-center gap-3">
              <input type="radio" name="kind" checked={kind === "no_show"} onChange={() => setKind("no_show")} />
              The keeper did not show up
            </label>
            <label className="flex min-h-11 items-center gap-3">
              <input type="radio" name="kind" checked={kind === "other"} onChange={() => setKind("other")} />
              Something else went wrong
            </label>
          </fieldset>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="What happened? (optional for a no show)"
            className="pl-input"
          />
          <p className="text-xs leading-relaxed text-muted">
            If the keeper never checked in, a no show report refunds you in full straight away. In any other case we hold the
            payment and review it, and nobody is paid until it is resolved.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => reportMatchAction(bookingId, kind, note), "Reported. We will review it.")}
            className={primary}
          >
            {pending ? "Sending…" : "Send report"}
          </button>
        </div>
      </Sheet>
    </>
  );
}

/** Cancelar la reserva. `consequence` lo calcula el servidor con las reglas de la spec y se repite al confirmar. */
export function CancelBookingButton({ bookingId, consequence }: { bookingId: string; consequence: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function cancel() {
    startTransition(async () => {
      const res = await cancelBookingAction(bookingId);
      if (res.error) {
        toast(res.error, "error");
        return;
      }
      setOpen(false);
      toast(res.message ?? "Booking cancelled.");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline underline-offset-4 transition-colors duration-200 hover:text-fg"
      >
        Cancel booking
      </button>
      <Sheet open={open} title="Cancel this booking?" onClose={() => !pending && setOpen(false)}>
        <p className="pl-prose text-[15px]">{consequence}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">Based on the time right now. This cannot be undone.</p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] bg-danger px-5 text-[15px] font-semibold text-accent-ink transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? "Cancelling…" : "Yes, cancel it"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] px-5 text-[15px] font-medium text-fg-2"
          >
            Keep the booking
          </button>
        </div>
      </Sheet>
    </>
  );
}
