"use client";

import type { ReactNode, PointerEvent } from "react";

/** Alimenta la línea naranja de `.pl-spotlight` con la posición del cursor sobre la tarjeta. */
export function trackPointer(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/** Contenedor con el borde que sigue al cursor, como las tarjetas de ejemplo de la home. */
export function Spotlight({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div onPointerMove={trackPointer} className={`pl-spotlight ${className}`}>
      {children}
    </div>
  );
}
