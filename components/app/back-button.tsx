"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/platform/icons";

/** Vuelve a la pantalla anterior; sin historial (enlace abierto directo) va a `fallback`. */
export function BackButton({ fallback, children = "Back" }: { fallback: string; children?: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted transition-colors duration-200 hover:text-fg"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {children}
    </button>
  );
}
