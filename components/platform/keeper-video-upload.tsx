"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CtaAction } from "@/components/platform/cta-button";
import { RequirementTag } from "@/components/platform/form-fields";
import {
  KEEPER_VIDEO_BUCKET,
  KEEPER_VIDEO_MAX,
  KEEPER_VIDEO_MAX_BYTES,
  KEEPER_VIDEO_TYPES,
  type KeeperVideo,
} from "@/lib/profile";

/** Sube los clips directamente a Storage (carpeta propia, bucket privado). Se guardan al momento, sin pulsar "Save profile". */
export function KeeperVideoUpload({ userId, initial }: { userId: string; initial: KeeperVideo[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [videos, setVideos] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    const ext = KEEPER_VIDEO_TYPES[file.type];
    if (!ext) return setError("Use an MP4, MOV or WebM video.");
    if (file.size > KEEPER_VIDEO_MAX_BYTES) return setError("Each clip must be under 50 MB. Trim it and try again.");
    if (videos.length >= KEEPER_VIDEO_MAX) return setError(`You can add up to ${KEEPER_VIDEO_MAX} clips.`);

    setBusy(true);
    const supabase = createClient();
    const path = `${userId}/clip-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(KEEPER_VIDEO_BUCKET)
      .upload(path, file, { contentType: file.type });
    if (uploadError) {
      console.error("keeper video upload failed", uploadError);
      setBusy(false);
      return setError("The upload failed. Check your connection and try again.");
    }
    const { data } = await supabase.storage.from(KEEPER_VIDEO_BUCKET).createSignedUrl(path, 60 * 60);
    setVideos((v) => [...v, { path, url: data?.signedUrl ?? "" }]);
    setBusy(false);
  }

  async function remove(path: string) {
    setError("");
    setBusy(true);
    const { error: removeError } = await createClient().storage.from(KEEPER_VIDEO_BUCKET).remove([path]);
    setBusy(false);
    if (removeError) return setError("We couldn't remove that clip. Please try again.");
    setVideos((v) => v.filter((x) => x.path !== path));
  }

  return (
    <div className="grid gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-fg-2">Clips of you in goal</span>
        <RequirementTag tag="optional" />
      </div>
      <p className="text-[13px] text-muted">
        Saves, distribution, anything that shows how you play. Teams you apply to can watch them, and they help the
        MatchKeeper team verify your profile faster. Up to {KEEPER_VIDEO_MAX} clips, 50 MB each.
      </p>

      {videos.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {videos.map((v, i) => (
            <li key={v.path} className="overflow-hidden rounded-[var(--r-lg)] border border-line bg-surface">
              <video src={v.url} controls preload="metadata" playsInline className="aspect-video w-full bg-black" aria-label={`Clip ${i + 1}`} />
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-muted">Clip {i + 1}</span>
                <button
                  type="button"
                  onClick={() => void remove(v.path)}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center font-semibold text-danger underline underline-offset-4 disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {videos.length < KEEPER_VIDEO_MAX && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={Object.keys(KEEPER_VIDEO_TYPES).join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-label="Add a clip"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <CtaAction variant="secondary" size="md" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? "Uploading…" : videos.length ? "Add another clip" : "Add a clip"}
          </CtaAction>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
