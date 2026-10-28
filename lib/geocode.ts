export type Place = { id: string; name: string; detail: string; label: string; lat: number; lng: number };

// Solo Londres está disponible, así que se acota la búsqueda a su área.
const LONDON_BBOX = "-0.6,51.2,0.4,51.75";
const LONDON_CENTER = "-0.1278,51.5074";

type Feature = {
  geometry: { coordinates: [number, number] };
  properties: {
    mapbox_id?: string;
    name: string;
    feature_type?: string;
    full_address?: string;
    place_formatted?: string;
  };
};

const tidy = (s: string) => s.replace(/,?\s*United Kingdom$/i, "").trim();

const FILLER = new Set(["london", "the", "and", "uk", "road", "street", "park"]);

// Mapbox devuelve lugares famosos aunque no tengan relación con lo escrito; se descartan los que no comparten ninguna palabra.
function relatedTo(query: string, text: string) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !FILLER.has(w));
  if (words.length === 0) return true;
  const haystack = text.toLowerCase();
  return words.some((w) => haystack.includes(w));
}

/** Busca canchas, parques y direcciones por nombre (Search Box API, que sí indexa lugares como en Google Maps). */
export async function searchPlaces(query: string): Promise<Place[]> {
  const params = new URLSearchParams({
    q: query,
    country: "gb",
    limit: "5",
    proximity: LONDON_CENTER,
    bbox: LONDON_BBOX,
    types: "poi,address,street,postcode,neighborhood,locality,place",
    language: "en",
    access_token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "",
  });
  const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/forward?${params}`);
  if (!res.ok) throw new Error(`Search failed with ${res.status}`);
  const json = (await res.json()) as { features?: Feature[] };

  const seen = new Set<string>();
  const places: Place[] = [];
  for (const f of json.features ?? []) {
    const [lng, lat] = f.geometry.coordinates;
    const p = f.properties;
    if (!relatedTo(query, `${p.name} ${p.full_address ?? ""} ${p.place_formatted ?? ""}`)) continue;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const area = tidy(p.place_formatted ?? "");
    const isPlace = p.feature_type === "poi";
    places.push({
      id: p.mapbox_id ?? key,
      name: p.name,
      detail: tidy(p.full_address ?? p.place_formatted ?? ""),
      label: isPlace && area ? `${p.name}, ${area}` : tidy(p.full_address ?? p.name),
      lat,
      lng,
    });
  }
  return places;
}
