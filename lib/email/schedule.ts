// Cuándo se manda cada aviso programado de una reserva (puro, probado con `npm test`).

export type ScheduledTemplate =
  | "keeper_checkin_24h"
  | "keeper_checkin_30m"
  | "team_played_prompt"
  | "team_played_reminder"
  | "team_autorelease_notice";

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Un aviso que saldría casi ya no se programa: el usuario acaba de enterarse por la confirmación. */
const MIN_LEAD_MS = 5 * MIN;

/**
 * Avisos que se programan al confirmarse el pago: recordatorios al portero antes del partido y avisos al equipo
 * después. Los que ya no tienen sentido (el partido es dentro de menos de 24 h, por ejemplo) se omiten.
 */
export function bookingSchedule(
  b: { startsAt: Date; endsAt: Date; autoReleaseAt: Date | null },
  now: Date,
): { template: ScheduledTemplate; sendAfter: Date }[] {
  const candidates: { template: ScheduledTemplate; sendAfter: Date | null }[] = [
    { template: "keeper_checkin_24h", sendAfter: new Date(b.startsAt.getTime() - 24 * HOUR) },
    { template: "keeper_checkin_30m", sendAfter: new Date(b.startsAt.getTime() - 30 * MIN) },
    { template: "team_played_prompt", sendAfter: b.endsAt },
    { template: "team_played_reminder", sendAfter: new Date(b.endsAt.getTime() + 24 * HOUR) },
    {
      template: "team_autorelease_notice",
      sendAfter: b.autoReleaseAt ? new Date(b.autoReleaseAt.getTime() - 24 * HOUR) : null,
    },
  ];
  return candidates.flatMap((c) =>
    c.sendAfter && c.sendAfter.getTime() - now.getTime() > MIN_LEAD_MS ? [{ template: c.template, sendAfter: c.sendAfter }] : [],
  );
}
