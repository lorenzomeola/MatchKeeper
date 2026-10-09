// Reglas del aviso de mensaje sin leer (puras, probadas con `npm test`).

/** Espera antes de avisar: si lo lee antes, el aviso se cancela. */
export const CHAT_DELAY_MS = 10 * 60_000;
/** Como máximo un aviso por conversación y destinatario en esta ventana. */
export const CHAT_THROTTLE_MS = 60 * 60_000;

export function chatNoticeAllowed(lastNoticeAt: Date | null, now: Date): boolean {
  return !lastNoticeAt || now.getTime() - lastNoticeAt.getTime() >= CHAT_THROTTLE_MS;
}

/** El destinatario ya abrió el hilo después de que se escribiera el mensaje. */
export function readAfter(lastReadAt: Date | null, messageAt: Date): boolean {
  return !!lastReadAt && lastReadAt.getTime() >= messageAt.getTime();
}

export const chatKey = (applicationId: string, recipientId: string) => `chat_unread:${applicationId}:${recipientId}:`;
