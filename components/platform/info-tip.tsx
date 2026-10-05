"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Botón "i" con explicación. Se abre al pasar el cursor o enfocar con teclado;
 * el clic lo fija abierto para pantallas táctiles. Escape y clic fuera lo cierran.
 * El panel se posiciona respecto al ancestro `relative` más cercano (el fieldset),
 * así no se sale de la pantalla en móvil.
 */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!pinned) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setPinned(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  return (
    <span ref={ref} className="group inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={pinned}
        onClick={() => setPinned((p) => !p)}
        className="pl-focus relative grid h-6 w-6 place-items-center rounded-full border border-line-strong text-[13px] font-semibold leading-none text-muted transition-colors duration-200 after:absolute after:-inset-2.5 after:content-[''] hover:border-accent hover:text-accent-strong group-focus-within:border-accent group-focus-within:text-accent-strong"
      >
        i
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute inset-x-0 top-full z-30 mt-2 rounded-[var(--r-md)] border border-line-strong bg-bg-2 p-4 text-left text-[13px] font-normal leading-relaxed text-fg-2 shadow-[var(--shadow-4)] transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 sm:right-auto sm:w-[26rem] ${
          pinned ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        {children}
      </span>
    </span>
  );
}
