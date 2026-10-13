"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "@/components/platform/icons";

/** Panel inferior en móvil, modal centrado desde `sm`. Escape y clic fuera lo cierran. */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // onClose suele ser una función nueva en cada render; si fuera dependencia del efecto, el foco volvería al panel con cada tecla.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-t-[var(--r-xl)] border border-line-strong bg-bg-2 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-[var(--shadow-4)] outline-none sm:rounded-[var(--r-xl)] sm:pb-5"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="pl-display text-fg [font-size:var(--t-xl)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-full text-muted transition-colors duration-200 hover:text-fg"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
