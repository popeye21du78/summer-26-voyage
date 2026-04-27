import { NextRequest, NextResponse } from "next/server";

type GeoLineString = { type: "LineString"; coordinates: [number, number][] };

function parseMapboxResponse(data: {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: GeoLineString;
    legs?: Array<{ distance?: number; duration?: number }>;
  }>;
}) {
  if (data.code !== "Ok" || !data.routes?.[0]) return null;
  const route = data.routes[0];
  const distanceM = route.distance ?? 0;
  const durationS = route.duration ?? 0;
  const geometry = route.geometry;
  const legs = (route.legs ?? []).map((leg) => {
    const dm = leg.distance ?? 0;
    const ds = leg.duration ?? 0;
    return {
      distanceKm: Math.round((dm / 1000) * 10) / 10,
      durationMin: Math.round(ds / 60),
    };
  });
  return {
    distanceKm: Math.round((distanceM / 1000) * 10) / 10,
    durationMin: Math.round(durationS / 60),
    geometry: geometry && geometry.type === "LineString" ? geometry : null,
    legs,
  };
}

/**
 * Itinéraire (géométrie GeoJSON + jambes) via Mapbox Directions.
 * `profile=driving` (défaut) : voiture ; `noMotorway=1` tente d’éviter les autoroutes puis repli.
 * `profile=cycling` : vélo (profil Mapbox cycling, pas d’exclusion autoroute).
 * GET /api/directions/geometry?waypoints=...&profile=driving|cycling&noMotorway=0|1
 */
export async function GET(request: NextRequest) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Token Mapbox non configuré" },
      { status: 503 }
    );
  }
  const wp = request.nextUrl.searchParams.get("waypoints");
  if (!wp?.trim()) {
    return NextResponse.json(
      { error: "Paramètre waypoints requis (lng,lat;lng,lat;...)" },
      { status: 400 }
    );
  }
  const noMotorwayParam = request.nextUrl.searchParams.get("noMotorway");
  const wantNoMotorway =
    noMotorwayParam === null || noMotorwayParam === "1" || noMotorwayParam === "true";

  const parts = wp.split(";").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) {
    return NextResponse.json(
      { error: "Au moins deux points sont nécessaires" },
      { status: 400 }
    );
  }
  if (parts.length > 25) {
    return NextResponse.json(
      { error: "Trop de points (max. 25)" },
      { status: 400 }
    );
  }
  for (const p of parts) {
    const [a, b] = p.split(",").map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(b) > 90 || Math.abs(a) > 180) {
      return NextResponse.json(
        { error: "Coordonnées invalides dans waypoints" },
        { status: 400 }
      );
    }
  }
  const coords = parts.join(";");
  const profileRaw = request.nextUrl.searchParams.get("profile");
  const isCycling = profileRaw === "cycling";

  try {
    if (isCycling) {
      const url = new URL(
        `https://api.mapbox.com/directions/v5/mapbox/cycling/${coords}`
      );
      url.searchParams.set("access_token", token);
      url.searchParams.set("geometries", "geojson");
      url.searchParams.set("overview", "full");
      const res = await fetch(url.toString());
      if (!res.ok) {
        const err = await res.text();
        console.error("Mapbox Directions (cycling):", res.status, err);
        return NextResponse.json(
          { error: "Erreur Directions Mapbox" },
          { status: 502 }
        );
      }
      const data = (await res.json()) as Parameters<typeof parseMapboxResponse>[0];
      const parsed = parseMapboxResponse(data);
      if (!parsed) {
        return NextResponse.json(
          { error: "Aucun itinéraire vélo trouvé" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        distanceKm: parsed.distanceKm,
        durationMin: parsed.durationMin,
        geometry: parsed.geometry,
        legs: parsed.legs,
        avoidMotorways: false,
        profile: "cycling" as const,
      });
    }

    const run = async (excludeMotorway: boolean) => {
      const url = new URL(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`
      );
      url.searchParams.set("access_token", token);
      url.searchParams.set("geometries", "geojson");
      url.searchParams.set("overview", "full");
      if (excludeMotorway) {
        url.searchParams.set("exclude", "motorway");
      }
      return fetch(url.toString());
    };

    let res = await run(wantNoMotorway);
    if (!res.ok) {
      const err = await res.text();
      console.error("Mapbox Directions (geometry):", res.status, err);
      return NextResponse.json(
        { error: "Erreur Directions Mapbox" },
        { status: 502 }
      );
    }
    let data = (await res.json()) as Parameters<typeof parseMapboxResponse>[0];
    let parsed = parseMapboxResponse(data);
    let avoidMotorways = Boolean(parsed && wantNoMotorway);
    if (!parsed && wantNoMotorway) {
      res = await run(false);
      if (!res.ok) {
        return NextResponse.json(
          { error: "Erreur Directions Mapbox" },
          { status: 502 }
        );
      }
      data = (await res.json()) as Parameters<typeof parseMapboxResponse>[0];
      parsed = parseMapboxResponse(data);
      avoidMotorways = false;
    }
    if (!parsed) {
      return NextResponse.json(
        { error: "Aucun itinéraire trouvé" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      distanceKm: parsed.distanceKm,
      durationMin: parsed.durationMin,
      geometry: parsed.geometry,
      legs: parsed.legs,
      avoidMotorways,
      profile: "driving" as const,
    });
  } catch (e) {
    console.error("API directions geometry:", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
