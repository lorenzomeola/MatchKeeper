"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, usePrefersReducedMotion } from "@/components/platform/reveal";

type Stat = {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  detail: string;
};

/**
 * Cifras de MECANISMO, no de tracción. En fase piloto no hay volumen que
 * presumir, así que se muestra lo que sí es verificable hoy: comisión, tiempo
 * de publicación, retención del pago y coste de alta. Honesto y, aun así,
 * concreto — que es lo que genera confianza en un marketplace.
 */
const STATS: Stat[] = [
  { value: 15, suffix: "%", label: "Platform fee", detail: "No subscription or listing cost" },
  { value: 2, prefix: "<", suffix: " min", label: "To post a match", detail: "Date, pitch and level" },
  { value: 100, suffix: "%", label: "Held until confirmed", detail: "Stripe releases after the match" },
  { value: 0, prefix: "£", label: "To join as a keeper", detail: "Free profile, you set your rate" },
];

// Beta sin pagos: ni comisión ni retención de pago que mostrar.
const STATS_BETA: Stat[] = [
  { value: 0, prefix: "£", label: "To use the beta", detail: "No fees, no subscription" },
  { value: 2, prefix: "<", suffix: " min", label: "To post a match", detail: "Date, pitch and level" },
  { value: 100, suffix: "%", label: "Keepers reviewed", detail: "A person checks every profile" },
  { value: 18, suffix: "+", label: "Adults only", detail: "Adult football in London" },
];

export function StatBand({ payments = true }: { payments?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.4 });
  const stats = payments ? STATS : STATS_BETA;

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--r-xl)] border border-line bg-line lg:grid-cols-4"
    >
      {stats.map((s, i) => (
        <div key={s.label} className="bg-bg-2/60 p-5 backdrop-blur-sm sm:p-6">
          <p className="pl-display pl-tnum text-fg [font-size:var(--t-3xl)]">
            {s.prefix}
            <CountUp to={s.value} active={inView} delay={i * 110} />
            {s.suffix}
          </p>
          <p className="mt-2 text-sm font-semibold text-fg-2">{s.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{s.detail}</p>
        </div>
      ))}
    </div>
  );
}

/** Cuenta hasta el valor con rAF y easing de salida; sin timers por frame. */
function CountUp({ to, active, delay = 0 }: { to: number; active: boolean; delay?: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const [n, setN] = useState(0);
  const animate = active && !reducedMotion && to !== 0;

  useEffect(() => {
    if (!animate) return;

    let raf = 0;
    const duration = 900;

    const start = setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
        setN(Math.round(to * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(start);
      cancelAnimationFrame(raf);
    };
  }, [animate, to, delay]);

  return <span>{animate ? n : to}</span>;
}
