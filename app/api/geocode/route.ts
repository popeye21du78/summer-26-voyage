import { NextRequest, NextResponse } from "next/server";

/**
 * Géocodage via Mapbox : nom de ville → coordonnées.
 * GET /api/geocode?q=Marseille
 */
export async function GET(request: NextRequest) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const q = request.nextUrl.searchParams.get("q");
  if (!token || !q?.trim()) {
    return NextResponse.json(
      { error: "Paramètre q requis et token Mapbox configuré" },
      { status: 400 }
    );
  }
  try {
    const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
    url.searchParams.set("q", q.trim());
    url.searchParams.set("access_token", token);
    url.searchParams.set("country", "fr");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.text();
      console.error("Mapbox Geocoding:", res.status, err);
      return NextResponse.json(
        { error: "Erreur géocodage Mapbox" },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: {
          name?: string;
          context?: { place?: { name?: string } };
        };
      }>;
    };
    const feature = data.features?.[0];
    if (!feature?.geometry?.coordinates) {
      return NextResponse.json(
        { error: "Aucun résultat pour cette recherche" },
        { status: 404 }
      );
    }
    const [lng, lat] = feature.geometry.coordinates;
    const name =
      feature.properties?.name ??
      feature.properties?.context?.place?.name ??
      q.trim();
    return NextResponse.json({ lat, lng, name });
  } catch (e) {
    console.error("API geocode:", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
