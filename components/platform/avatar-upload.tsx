"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CtaAction } from "@/components/platform/cta-button";
import { RequirementTag, type FieldTag } from "@/components/platform/form-fields";
import { AVATAR_MAX_BYTES, AVATAR_TYPES } from "@/lib/profile";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

type Status = "idle" | "uploading" | "error";

/**
 * Sube la foto directamente a Supabase Storage desde el navegador (evita el
 * límite de tamaño de las Server Actions) y devuelve la URL pública. La RLS del
 * bucket solo permite escribir dentro de la carpeta `<userId>/`.
 */
export function AvatarUpload({
  userId,
  value,
  initials,
  label,
  hint,
  error,
  tag,
  onChange,
}: {
  userId: string;
  value: string;
  initials: string;
  label: string;
  hint: string;
  error?: string;
  tag?: FieldTag;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [localError, setLocalError] = useState("");

  async function handleFile(file: File) {
    setLocalError("");
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
      setStatus("error");
      setLocalError("Use a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setStatus("error");
      setLocalError("The photo must be under 5 MB.");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setStatus("uploading");

    const supabase = createClient();
    const path = `${userId}/avatar-${Date.now()}.${EXT[file.type]}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, cacheControl: "31536000" });

    if (uploadError) {
      console.error("avatar upload failed", uploadError);
      setStatus("error");
      setLocalError("The upload failed. Check your connection and try again.");
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    onChange(data.publicUrl);
    setStatus("idle");
  }

  const src = preview || value;
  const shownError = localError || error;

  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-fg-2">{label}</span>
        {tag && <RequirementTag tag={tag} />}
      </div>
      <div className="flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--r-xl)] border border-line-strong bg-surface shadow-[var(--ring-inset)]">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob: preview y URL de Storage, sin optimizador
            <img src={src} alt="Your profile photo" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden className="pl-display grid h-full w-full place-items-center text-fg-2 [font-size:var(--t-3xl)]">
              {initials}
            </span>
          )}
          {status === "uploading" && (
            <span className="pl-skeleton absolute inset-0 grid place-items-center bg-bg/60 text-xs font-medium text-fg">
              Uploading
            </span>
          )}
        </div>

        <div className="min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-label={label}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <CtaAction
            variant="secondary"
            size="md"
            onClick={() => inputRef.current?.click()}
            disabled={status === "uploading"}
          >
            {src ? "Change photo" : "Upload photo"}
          </CtaAction>
          <p className="mt-2 text-[13px] text-muted">{hint}</p>
        </div>
      </div>
      {shownError && (
        <p role="alert" className="text-[13px] text-danger">
          {shownError}
        </p>
      )}
    </div>
  );
}
