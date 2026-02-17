/**
 * Géocodage Mapbox (nom → lat, lng). Utilisé par cities-from-xlsx pour remplir les coordonnées manquantes.
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  name: string;
}

export async function geocodeCity(
  query: string,
  options?: { departement?: string }
): Promise<GeocodeResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token?.trim()) return null;

  const q = options?.departement
    ? `${query.trim()}, ${options.departement}, France`
    : `${query.trim()}, France`;

  try {
    const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
    url.searchParams.set("q", q);
    url.searchParams.set("access_token", token);
    url.searchParams.set("country", "fr");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: { name?: string; context?: { place?: { name?: string } } };
      }>;
    };

    const feature = data.features?.[0];
    if (!feature?.geometry?.coordinates) return null;

    const [lng, lat] = feature.geometry.coordinates;
    const name =
      feature.properties?.name ??
      feature.properties?.context?.place?.name ??
      query.trim();

    return { lat, lng, name };
  } catch {
    return null;
  }
}
