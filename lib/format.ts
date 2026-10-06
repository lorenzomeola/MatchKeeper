// Todo el producto opera en hora de Londres, sin importar la zona del servidor o del navegador.
const TZ = "Europe/London";

const parts = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(new Date(iso));

export function dateTile(iso: string) {
  return {
    weekday: parts(iso, { weekday: "short" }),
    day: parts(iso, { day: "numeric" }),
    month: parts(iso, { month: "short" }),
  };
}

export function timeRange(startIso: string, endIso: string) {
  const t = (iso: string) => parts(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${t(startIso)} to ${t(endIso)}`;
}

export function longDate(iso: string) {
  return parts(iso, { weekday: "long", day: "numeric", month: "long" });
}

/** "Hackney Marshes, Homerton Rd, London" -> nombre del campo y el resto de la dirección. */
export function splitAddress(address: string | null | undefined) {
  const a = (address ?? "").trim();
  if (!a) return { name: "Pitch to be confirmed", rest: "" };
  const i = a.indexOf(",");
  return i > 0 ? { name: a.slice(0, i).trim(), rest: a.slice(i + 1).trim() } : { name: a, rest: "" };
}

/** "March 2026". */
export function monthYear(iso: string) {
  return parts(iso, { month: "long", year: "numeric" });
}

export function shortDate(iso: string) {
  return parts(iso, { day: "numeric", month: "short", year: "numeric" });
}

/** "Today", "Tomorrow" o "In 5 days", contando días naturales de Londres. */
export function daysAway(iso: string) {
  const day = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // yyyy-mm-dd
  const diff = Math.round(
    (Date.parse(day(new Date(iso))) - Date.parse(day(new Date()))) / 86_400_000,
  );
  if (diff <= 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

export function money(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return `£${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/** Peniques enteros -> "£34.50", siempre con dos decimales (para desgloses de pago). */
export function moneyPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

/** Fecha de hoy en Londres como yyyy-mm-dd, para el `min` de un campo date. */
export function todayLondon() {
  return ymd(new Date());
}

export function isPast(iso: string) {
  return Date.parse(iso) < Date.now();
}

/** Día natural de Londres (yyyy-mm-dd) de un instante. */
export function londonDay(iso: string) {
  return ymd(new Date(iso));
}

/** 0 = lunes ... 6 = domingo, para un día yyyy-mm-dd. */
export function mondayIndex(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Suma días a un yyyy-mm-dd sin pasar por zonas horarias. */
export function addDays(day: string, n: number) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function clockTime(iso: string) {
  return parts(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Hora si es de hoy, "Yesterday" o "5 Oct". Para la bandeja de mensajes. */
export function shortWhen(iso: string) {
  const dayDiff = Math.round((Date.parse(ymd(new Date())) - Date.parse(ymd(new Date(iso)))) / 86_400_000);
  if (dayDiff <= 0) return clockTime(iso);
  if (dayDiff === 1) return "Yesterday";
  return parts(iso, { day: "numeric", month: "short" });
}

/** Separador de día dentro de una conversación. */
export function dayLabel(iso: string) {
  const dayDiff = Math.round((Date.parse(ymd(new Date())) - Date.parse(ymd(new Date(iso)))) / 86_400_000);
  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return parts(iso, { weekday: "short", day: "numeric", month: "short" });
}

export const SURFACE_LABEL: Record<string, string> = {
  grass: "Grass",
  artificial: "Artificial turf",
  indoor: "Indoor",
  futsal: "Futsal",
};

export function firstName(name: string | null | undefined) {
  return (name ?? "").trim().split(/\s+/)[0] || "there";
}

/**
 * Convierte "2026-10-08T19:00" (hora de pared de Londres, lo que escribe el usuario)
 * en un instante UTC. Sin esto el servidor interpretaría la hora en SU zona horaria.
 */
export function londonLocalToIso(local: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);

  const offsetAt = (ms: number) => {
    const p = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(ms));
    const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute")) - ms;
  };

  // Dos pasadas: la segunda corrige el caso de un instante cercano al cambio de hora.
  let ms = wall - offsetAt(wall);
  ms = wall - offsetAt(ms);
  return new Date(ms).toISOString();
}
