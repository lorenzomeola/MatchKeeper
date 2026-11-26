/** UK mobile in E.164 (+447XXXXXXXXX), or null if it isn't one. Accepts 07..., +447..., 00447... with spaces, dashes or brackets. */
export function normalizeUkMobile(input: string): string | null {
  const digits = input.trim().replace(/[\s\-().]/g, "");
  const m = /^(?:\+44|0044|44|0)(7\d{9})$/.exec(digits);
  return m ? `+44${m[1]}` : null;
}

/** +447700900123 -> 07700 900123 */
export function formatUkMobile(e164: string): string {
  const national = e164.startsWith("+44") ? `0${e164.slice(3)}` : e164;
  return national.length === 11 ? `${national.slice(0, 5)} ${national.slice(5)}` : national;
}
