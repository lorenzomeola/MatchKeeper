import type { KeeperVideo } from "@/lib/profile";

/** Clips de un portero, con enlaces temporales ya firmados en el servidor. */
export function KeeperVideos({ videos, className = "" }: { videos: KeeperVideo[]; className?: string }) {
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {videos.map((v, i) => (
        <li key={v.path} className="overflow-hidden rounded-[var(--r-lg)] border border-line bg-black">
          <video src={v.url} controls preload="metadata" playsInline className="aspect-video w-full" aria-label={`Clip ${i + 1}`} />
        </li>
      ))}
    </ul>
  );
}
