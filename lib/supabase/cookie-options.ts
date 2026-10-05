// En desarrollo el preview de iPhone de VS Code carga la app en un iframe de otro sitio: sin SameSite=None las cookies de sesión se descartan.
export const cookieOptions =
  process.env.NODE_ENV === "development" ? { sameSite: "none" as const, secure: true } : undefined;
