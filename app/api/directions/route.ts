import { NextRequest, NextResponse } from "next/server";

/**
 * Itinéraire routier via Mapbox Directions API.
 * Retourne distance (km) et durée (min) pour un trajet en voiture.
 * GET /api/directions?from=lat,lng&to=lat,lng
 */
export async function GET(request: NextRequest) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Token Mapbox non configuré" },
      { status: 503 }
    );
  }
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");
  if (!fromParam || !toParam) {
    return NextResponse.json(
      { error: "Paramètres from et to requis (lat,lng)" },
      { status: 400 }
    );
  }
  const parse = (s: string): { lat: number; lng: number } | null => {
    const [lat, lng] = s.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  };
  const from = parse(fromParam);
  const to = parse(toParam);
  if (!from || !to) {
    return NextResponse.json(
      { error: "Coordonnées invalides" },
      { status: 400 }
    );
  }
  try {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      console.error("Mapbox Directions:", res.status, err);
      return NextResponse.json(
        { error: "Erreur Directions Mapbox" },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{ distance?: number; duration?: number }>;
    };
    if (data.code !== "Ok" || !data.routes?.[0]) {
      return NextResponse.json(
        { error: "Aucun itinéraire trouvé" },
        { status: 404 }
      );
    }
    const route = data.routes[0];
    const distanceM = route.distance ?? 0;
    const durationS = route.duration ?? 0;
    return NextResponse.json({
      distanceKm: Math.round((distanceM / 1000) * 10) / 10,
      durationMin: Math.round(durationS / 60),
    });
  } catch (e) {
    console.error("API directions:", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
