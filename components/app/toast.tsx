"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckIcon, CloseIcon } from "@/components/platform/icons";

type Tone = "success" | "error";
type Toast = { id: number; message: string; tone: Tone };

const ToastContext = createContext<{ toast: (message: string, tone?: Tone) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/** Avisos breves no bloqueantes. Se colocan sobre la barra inferior en móvil. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (message: string, tone: Tone = "success") => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 6000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-8"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="pl-glass pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[var(--r-md)] py-3 pl-3 pr-2 text-sm text-fg"
          >
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                t.tone === "error" ? "bg-danger/20 text-danger" : "bg-accent-soft text-accent"
              }`}
            >
              {t.tone === "error" ? <CloseIcon className="h-3.5 w-3.5" /> : <CheckIcon className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0 flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:text-fg"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
