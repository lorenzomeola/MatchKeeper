// Foto opcional que el portero añade al llegar, para que el equipo sepa dónde encontrarlo. Sin dependencias.

export const CHECKIN_PHOTO_BUCKET = "checkin-photos";
/** Lo que acepta el servidor; el navegador reduce la foto por debajo de esto antes de enviarla. */
export const CHECKIN_PHOTO_MAX_BYTES = 800_000;
export const CHECKIN_PHOTO_VIEW_SECONDS = 3600;

/** Solo con el check-in hecho, una vez por reserva y hasta que termina el partido. */
export function canAddCheckInPhoto(i: {
  status: string;
  checkedIn: boolean;
  hasPhoto: boolean;
  now: Date;
  endsAt: Date;
}): boolean {
  return i.status === "confirmed" && i.checkedIn && !i.hasPhoto && i.now <= i.endsAt;
}
