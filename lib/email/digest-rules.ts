// Reglas del resumen semanal de partidos abiertos (puras, probadas con `npm test`).
import { dateTile, splitAddress, timeRange } from "../format.ts";

/** Partidos que empiezan en las próximas dos semanas. */
export const DIGEST_WINDOW_DAYS = 14;
/** Partidos que se listan en el email; el resto se resume en "and N more". */
export const DIGEST_LIST_MAX = 6;
/** Si un admin le escribió por el chat en este margen, ese día no se le manda el resumen. */
export const DIGEST_QUIET_AFTER_CHAT_MS = 24 * 3_600_000;

export type DigestMatch = {
  id: string;
  created_by: string;
  starts_at: string;
  ends_at: string;
  address: string | null;
  format: number | null;
};

/** Lo que le interesa a un portero: partidos ajenos a los que aún no ha aplicado, el más próximo primero. */
export function pickDigestMatches<T extends DigestMatch>(matches: T[], keeperId: string, appliedMatchIds: Set<string>): T[] {
  return matches
    .filter((m) => m.created_by !== keeperId && !appliedMatchIds.has(m.id))
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}

export function digestLine(m: DigestMatch): string {
  const t = dateTile(m.starts_at);
  return [
    `${t.weekday} ${t.day} ${t.month}, ${timeRange(m.starts_at, m.ends_at)}`,
    splitAddress(m.address).name,
    ...(m.format ? [`${m.format}-a-side`] : []),
  ].join(" · ");
}

/** Un resumen por portero y día de Londres: repetir el cron ese día no duplica el email. */
export function digestKey(keeperId: string, now: Date): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
  return `match_digest:${keeperId}:${day}`;
}

export function messagedRecently(lastAdminMessageAt: Date | null, now: Date): boolean {
  return !!lastAdminMessageAt && now.getTime() - lastAdminMessageAt.getTime() < DIGEST_QUIET_AFTER_CHAT_MS;
}
