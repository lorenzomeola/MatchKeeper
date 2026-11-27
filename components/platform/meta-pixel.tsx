"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CtaAction } from "@/components/platform/cta-button";
import {
  ADS_CONSENT_STORAGE_KEY,
  COOKIE_SETTINGS_EVENT,
  META_PIXEL_ID,
  grantMetaPixel,
  isPixelPage,
  loadMetaPixel,
  parseAdsConsent,
  revokeMetaPixel,
  trackMetaEvent,
  type AdsConsent,
} from "@/lib/meta-pixel";

/* El consentimiento vive en localStorage (como el tema) y React se suscribe a
   él: en el servidor es "unknown" para no pintar el aviso antes de leerlo. */
type ConsentSnapshot = AdsConsent | "unset" | "unknown";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): ConsentSnapshot {
  try {
    return parseAdsConsent(localStorage.getItem(ADS_CONSENT_STORAGE_KEY)) ?? "unset";
  } catch {
    return "unset";
  }
}

const getServerSnapshot = (): ConsentSnapshot => "unknown";

// Evita un PageView doble para la misma ruta (StrictMode o un layout que se vuelve a montar).
let lastTrackedPath: string | null = null;

function saveConsent(next: AdsConsent) {
  const previous = getSnapshot();
  try {
    localStorage.setItem(ADS_CONSENT_STORAGE_KEY, next);
  } catch {
    /* modo privado: la elección dura lo que dure la página */
  }
  if (next === "denied" && previous === "granted") {
    revokeMetaPixel();
    lastTrackedPath = null;
  }
  if (next === "granted" && previous === "denied") grantMetaPixel();
  emit();
}

/**
 * Píxel de Meta + aviso de cookies de las páginas públicas. Se monta en sus
 * layouts; sin `NEXT_PUBLIC_META_PIXEL_ID` no pinta ni carga nada.
 */
export function MetaPixel() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const enabled = META_PIXEL_ID !== null && isPixelPage(pathname);

  useEffect(() => {
    if (!enabled || !META_PIXEL_ID || consent !== "granted") return;
    loadMetaPixel(META_PIXEL_ID);
    if (lastTrackedPath === pathname) return;
    lastTrackedPath = pathname;
    trackMetaEvent("PageView");
  }, [enabled, consent, pathname]);

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener(COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, open);
  }, []);

  if (!enabled || consent === "unknown") return null;
  if (consent !== "unset" && !settingsOpen) return null;

  return (
    <CookieBanner
      current={consent === "unset" ? null : consent}
      onChoose={(next) => {
        saveConsent(next);
        setSettingsOpen(false);
      }}
    />
  );
}

function CookieBanner({
  current,
  onChoose,
}: {
  current: AdsConsent | null;
  onChoose: (next: AdsConsent) => void;
}) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-[34rem] rounded-[var(--r-xl)] border border-line bg-surface p-5 text-fg shadow-[var(--shadow-2),var(--ring-inset)] sm:inset-x-6"
    >
      <h2 id={titleId} className="text-base font-semibold text-fg">
        Cookies for our ads
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-fg-2">
        With your OK, we use the Meta Pixel to see which of our ads bring people to MatchKeeper. It sets a
        Meta cookie and tells Meta which of our public pages you visit and when you sign up. Nothing loads
        unless you accept.{" "}
        <Link href="/privacy#cookies" className="pl-focus font-semibold text-accent-strong underline underline-offset-4">
          Privacy Policy
        </Link>
      </p>
      {current && (
        <p className="mt-2 text-[13px] text-muted">
          Current choice: {current === "granted" ? "accepted" : "rejected"}.
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <CtaAction variant="secondary" size="sm" className="w-full" onClick={() => onChoose("denied")}>
          Reject
        </CtaAction>
        <CtaAction variant="secondary" size="sm" className="w-full" onClick={() => onChoose("granted")}>
          Accept
        </CtaAction>
      </div>
    </section>
  );
}

/** Enlace del footer para cambiar la elección. Solo aparece si el píxel está configurado. */
export function CookieSettingsButton({ className = "" }: { className?: string }) {
  if (!META_PIXEL_ID) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}
      className={className}
    >
      Cookie settings
    </button>
  );
}
