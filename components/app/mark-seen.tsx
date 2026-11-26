"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markApplicationsSeenAction, markExploreSeenAction } from "@/lib/actions/seen";

/** Marca lo nuevo como visto y refresca el contador del menú. Lo que ya se pintó como "New" no cambia. */
export function MarkSeen({ matchId }: { matchId?: string }) {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    void (matchId ? markApplicationsSeenAction(matchId) : markExploreSeenAction()).then(() => {
      if (!cancelled) router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [matchId, router]);
  return null;
}
