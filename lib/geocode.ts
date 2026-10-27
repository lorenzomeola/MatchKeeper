export type Place = { id: string; name: string; detail: string; label: string; lat: number; lng: number };

// Solo Londres está disponible, así que se acota la búsqueda a su área.
const LONDON_BBOX = "-0.6,51.2,0.4,51.75";
const LONDON_CENTER = "-0.1278,51.5074";

type Feature = {
  geometry: { coordinates: [number, number] };
  properties: {
    mapbox_id?: string;
    name: string;
    full_address?: string;
    place_formatted?: string;
  };
};

const tidy = (s: string) => s.replace(/,?\s*United Kingdom$/i, "").trim();

/** Geocoding permanente permite guardar la direccion/coordenadas; no busca nombres de POI. */
export async function searchPlaces(query: string): Promise<Place[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error("Mapbox search is not configured.");
  const params = new URLSearchParams({
    q: query,
    permanent: "true",
    autocomplete: "false",
    country: "gb",
    limit: "5",
    proximity: LONDON_CENTER,
    bbox: LONDON_BBOX,
    types: "address,street,postcode,neighborhood,locality,place",
    language: "en",
    access_token: token,
  });
  const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`);
  if (!res.ok) throw new Error(`Search failed with ${res.status}`);
  const json = (await res.json()) as { features?: Feature[] };
  if (!Array.isArray(json.features)) throw new Error("Invalid geocoding response.");

  const seen = new Set<string>();
  const places: Place[] = [];
  for (const f of json.features) {
    const [lng, lat] = f.geometry.coordinates;
    const p = f.properties;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !p.name?.trim()) {
      throw new Error("Invalid geocoding result.");
    }
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({
      id: p.mapbox_id ?? key,
      name: p.name,
      detail: tidy(p.full_address ?? p.place_formatted ?? ""),
      label: tidy(p.full_address ?? [p.name, p.place_formatted].filter(Boolean).join(", ")),
      lat,
      lng,
    });
  }
  return places;
}
