import type { ReactNode } from "react";
import type { KeeperVideo } from "@/lib/profile";

/** Clips de un portero, con enlaces temporales ya firmados en el servidor. `action` añade un control bajo cada clip. */
export function KeeperVideos({
  videos,
  className = "",
  action,
}: {
  videos: KeeperVideo[];
  className?: string;
  action?: (video: KeeperVideo) => ReactNode;
}) {
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {videos.map((v, i) => (
        <li key={v.path} className="overflow-hidden rounded-[var(--r-lg)] border border-line bg-surface">
          <video src={v.url} controls preload="metadata" playsInline className="aspect-video w-full bg-black" aria-label={`Clip ${i + 1}`} />
          {action?.(v)}
        </li>
      ))}
    </ul>
  );
}
