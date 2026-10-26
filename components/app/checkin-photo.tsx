"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useToast } from "@/components/app/toast";
import { addCheckInPhotoAction, removeCheckInPhotoAction } from "@/lib/actions/checkin-photo";
import { CHECKIN_PHOTO_MAX_BYTES } from "@/lib/payments/checkin-photo";

const MAX_SIDE = 1280;

const secondary =
  "inline-flex min-h-12 items-center justify-center rounded-[var(--r-md)] border border-line-strong px-5 text-[15px] font-medium text-fg transition-colors duration-200 hover:border-accent disabled:opacity-50";

/** Redibuja la foto en un canvas: baja el peso para subirla y, de paso, deja atrás el EXIF y su ubicación. */
async function shrinkToJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.65, 0.5]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= CHECKIN_PHOTO_MAX_BYTES) return blob;
    }
    throw new Error("too big");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Paso opcional tras el check-in: abre la cámara y envía la foto para que el equipo sepa dónde está el portero. */
export function CheckInPhotoUpload({ bookingId }: { bookingId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await shrinkToJpeg(file);
      const form = new FormData();
      form.append("photo", blob, "photo.jpg");
      startTransition(async () => {
        const res = await addCheckInPhotoAction(bookingId, form);
        setBusy(false);
        if (res.error) toast(res.error, "error");
        else {
          toast("Photo sent to your team.");
          router.refresh();
        }
      });
    } catch {
      setBusy(false);
      toast("We couldn't read that photo. Take a new one.", "error");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="grid gap-3 rounded-[var(--r-md)] border border-line p-4">
      <p className="text-[15px] font-medium text-fg">Help your team find you</p>
      <p className="text-sm leading-relaxed text-fg-2">
        Optional. Take a photo of the spot where you are waiting, such as the entrance or the pitch, and try to keep people out of it. Only your
        team and MatchKeeper can see it, and it is deleted 120 days after the match.
      </p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
      <div>
        <button type="button" className={secondary} disabled={busy || pending} onClick={() => input.current?.click()}>
          {busy || pending ? "Sending…" : "Take a photo"}
        </button>
      </div>
    </div>
  );
}

export function RemoveCheckInPhotoButton({ bookingId }: { bookingId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline-offset-4 hover:text-fg hover:underline disabled:opacity-50"
      onClick={() =>
        startTransition(async () => {
          const res = await removeCheckInPhotoAction(bookingId);
          if (res.error) toast(res.error, "error");
          else {
            toast("Photo removed.");
            router.refresh();
          }
        })
      }
    >
      {pending ? "Removing…" : "Remove photo"}
    </button>
  );
}
