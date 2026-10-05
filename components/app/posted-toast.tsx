"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/app/toast";

/** Muestra un aviso cuando se llega con `?posted=1` y limpia el parámetro. */
export function PostedToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const shown = useRef(false);
  const posted = params.get("posted") === "1";

  useEffect(() => {
    if (!posted || shown.current) return;
    shown.current = true;
    toast("Match posted. Keepers nearby can see it now.");
    router.replace(pathname, { scroll: false });
  }, [posted, toast, router, pathname]);

  return null;
}
