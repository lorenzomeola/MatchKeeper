type Place = { address: string | null; lat: number; lng: number };

const SAME_PLACE_METRES = 100;

const normalise = (s: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/** Mismo lugar si la dirección coincide o si las coordenadas están a menos de 100 m. */
export function isSamePlace(a: Place, b: Place): boolean {
  if (normalise(a.address) !== "" && normalise(a.address) === normalise(b.address)) return true;
  const dLat = (a.lat - b.lat) * 111_320;
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng) <= SAME_PLACE_METRES;
}
