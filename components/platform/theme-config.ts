/**
 * Configuración de tema compartida entre servidor y cliente.
 * Vive fuera de `theme.tsx` (que es `"use client"`) para que el layout de
 * servidor pueda inyectar el script anti-flash sin arrastrar el componente.
 */
export const THEME_STORAGE_KEY = "mk-theme";
export const DEFAULT_THEME = "dark" as const;

export type Theme = "dark" | "light";

/**
 * Corre antes del primer paint para evitar el flash de tema equivocado.
 * Solo escribe un atributo a partir de un valor de `localStorage` validado
 * contra una lista blanca: nada que provenga del usuario llega al DOM.
 * Se inyecta una sola vez en el <head> del layout raíz; la landing de "/" tiene
 * sus propios tokens y no lleva `data-theme`.
 */
export const themeInitScript = `(function(){if(location.pathname==="/")return;try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});document.documentElement.dataset.theme=(t==="light"||t==="dark")?t:${JSON.stringify(
  DEFAULT_THEME,
)}}catch(e){document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)}}})();`;
