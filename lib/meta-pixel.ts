/**
 * Meta Pixel para medir los anuncios de Meta. Solo se carga en las páginas
 * públicas, solo si hay un ID configurado y solo después de que la persona
 * acepte las cookies de publicidad (PECR en Reino Unido). Sin ID no se pide
 * consentimiento ni se carga nada.
 */

export type AdsConsent = "granted" | "denied";

export const ADS_CONSENT_STORAGE_KEY = "mk-ads-consent";

/** Evento de ventana con el que el footer reabre el aviso de cookies. */
export const COOKIE_SETTINGS_EVENT = "mk:cookie-settings";

const PIXEL_SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";

// Cookies propias que crea el píxel (_fbp siempre, _fbc al llegar desde un anuncio).
const PIXEL_COOKIES = ["_fbp", "_fbc"];

export function normalizePixelId(raw: string | undefined): string | null {
  const id = raw?.trim() ?? "";
  return /^\d{6,20}$/.test(id) ? id : null;
}

export const META_PIXEL_ID = normalizePixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID);

// Páginas de (auth) a las que ya se llega con sesión iniciada: ahí ni píxel ni aviso.
const ACCOUNT_PATHS = ["/onboarding", "/reset-password"];

export function isPixelPage(pathname: string): boolean {
  return !ACCOUNT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function parseAdsConsent(raw: string | null): AdsConsent | null {
  return raw === "granted" || raw === "denied" ? raw : null;
}

/** Dominios en los que pudo quedar una cookie del píxel: el host y cada dominio padre. */
export function cookieDomainsFor(hostname: string): string[] {
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length < 2) return [];
  const domains: string[] = [];
  for (let i = 0; i <= parts.length - 2; i++) domains.push(parts.slice(i).join("."));
  return domains;
}

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
};

type PixelWindow = Window & { fbq?: Fbq; _fbq?: Fbq };

/** Versión tipada del snippet oficial: cola `fbq` + `fbevents.js` asíncrono. Idempotente. */
export function loadMetaPixel(pixelId: string) {
  const w = window as PixelWindow;
  if (w.fbq) return;

  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  }) as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  // Los PageView los mandamos nosotros por ruta; si no, fbevents.js añade otro en cada
  // navegación del cliente, también al entrar en la zona de cuenta.
  fbq.disablePushState = true;
  w.fbq = fbq;
  if (!w._fbq) w._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = PIXEL_SCRIPT_SRC;
  document.head.appendChild(script);

  // "Manual only": sin esto el píxel envía por su cuenta los clics en botones y metadatos de la página.
  fbq("set", "autoConfig", false, pixelId);
  fbq("init", pixelId);
}

/** No hace nada si el píxel no se ha cargado, es decir, sin consentimiento. */
export function trackMetaEvent(event: "PageView" | "CompleteRegistration", params?: Record<string, string>) {
  const { fbq } = window as PixelWindow;
  if (!fbq) return;
  if (params) fbq("track", event, params);
  else fbq("track", event);
}

/** Vuelve a aceptar en la misma sesión después de haber retirado el consentimiento. */
export function grantMetaPixel() {
  (window as PixelWindow).fbq?.("consent", "grant");
}

/** Al retirar el consentimiento: el píxel deja de enviar y se borran sus cookies. */
export function revokeMetaPixel() {
  (window as PixelWindow).fbq?.("consent", "revoke");
  const domains = cookieDomainsFor(window.location.hostname);
  for (const name of PIXEL_COOKIES) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
  }
}
