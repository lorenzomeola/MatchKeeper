"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/app/toast";

/** Muestra un aviso cuando se llega con `?posted=1` o `?updated=1` y limpia el parámetro. */
export function PostedToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const shown = useRef(false);
  const posted = params.get("posted") === "1";
  const updated = params.get("updated") === "1";

  useEffect(() => {
    if ((!posted && !updated) || shown.current) return;
    shown.current = true;
    toast(posted ? "Match posted. Keepers nearby can see it now." : "Match updated.");
    router.replace(pathname, { scroll: false });
  }, [posted, updated, toast, router, pathname]);

  return null;
}
