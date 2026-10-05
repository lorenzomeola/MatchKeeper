export const MAP_STYLE = {
  dark: "mapbox://styles/mapbox/dark-v11",
  light: "mapbox://styles/mapbox/light-v11",
} as const;

/** Tema real del documento. El del contexto de React arranca en oscuro durante la hidratación. */
export function domTheme(): "dark" | "light" {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Centro de Londres: vista inicial cuando no hay partidos ni ubicación. */
export const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 };

/** Distancia en km entre dos puntos (fórmula de Haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
