import { NextRequest, NextResponse } from "next/server";

/**
 * Géocodage via Mapbox : nom de ville → coordonnées.
 * GET /api/geocode?q=Marseille
 */
export async function GET(request: NextRequest) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const q = request.nextUrl.searchParams.get("q");
  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(10, Math.max(1, parseInt(limitRaw ?? "1", 10) || 1));
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
    url.searchParams.set("limit", String(limit));
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
          place_formatted?: string;
          full_address?: string;
          context?: { place?: { name?: string } };
        };
      }>;
    };
    if (limit > 1) {
      const suggestions: Array<{
        name: string;
        label: string;
        lat: number;
        lng: number;
      }> = [];
      for (const f of data.features ?? []) {
        if (!f.geometry?.coordinates) continue;
        const [lng, lat] = f.geometry.coordinates;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const name =
          f.properties?.name?.trim() ||
          f.properties?.context?.place?.name?.trim() ||
          q.trim();
        const label =
          f.properties?.place_formatted ||
          f.properties?.full_address ||
          name;
        suggestions.push({ name, label, lat, lng });
      }
      return NextResponse.json({ suggestions }, { status: 200 });
    }
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
