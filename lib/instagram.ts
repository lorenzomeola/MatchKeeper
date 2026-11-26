/** Usuario de Instagram sin @ y en minusculas, o null si no es valido. Acepta @usuario o el enlace al perfil. */
export function normalizeInstagram(input: string): string | null {
  const handle = input
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle.toLowerCase() : null;
}
