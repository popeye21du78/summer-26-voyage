import { NextResponse } from "next/server";
import lieuxRaw from "@/data/cities/lieux-central.json";
import {
  lieuCompositeScore,
  lieuMatchesAmbianceFilters,
  villePointLimitForZoom,
} from "@/lib/inspiration-lieux-ambiance";
import {
  filterLieuxByMapRegion,
  type LieuCentralRow,
} from "@/lib/inspiration-lieux-region";
import type {
  InspirationAmbianceFilter,
  InspirationPoiTypeFilter,
} from "@/lib/editorial-territories";

const AMBIANCE_IDS: InspirationAmbianceFilter[] = [
  "mer",
  "villages",
  "nature",
  "patrimoine",
  "road_trip",
  "moins_connu",
];

const POI_TYPE_IDS: InspirationPoiTypeFilter[] = [
  "patrimoine",
  "plage",
  "rando",
  "village",
];

function parseAmbiances(sp: URLSearchParams): InspirationAmbianceFilter[] {
  const raw = sp.getAll("ambiance").concat(
    (sp.get("ambiances") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const out: InspirationAmbianceFilter[] = [];
  for (const x of raw) {
    if (AMBIANCE_IDS.includes(x as InspirationAmbianceFilter)) {
      out.push(x as InspirationAmbianceFilter);
    }
  }
  return [...new Set(out)];
}

function parsePoiTypes(sp: URLSearchParams): InspirationPoiTypeFilter[] {
  const raw = sp.getAll("poiType").concat(
    (sp.get("poiTypes") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const out: InspirationPoiTypeFilter[] = [];
  for (const x of raw) {
    if (POI_TYPE_IDS.includes(x as InspirationPoiTypeFilter)) {
      out.push(x as InspirationPoiTypeFilter);
    }
  }
  return [...new Set(out)];
}

function lieuMatchesPoiTypes(
  lieu: LieuCentralRow,
  poiTypes: InspirationPoiTypeFilter[]
): boolean {
  if (poiTypes.length === 0) return true;
  const sourceType = (lieu.source_type ?? "").toLowerCase();
  const category = (lieu.categorie_taille ?? "").toLowerCase();
  const family = (lieu.famille_type ?? "").toLowerCase();
  return poiTypes.some((poiType) => {
    switch (poiType) {
      case "patrimoine":
        return sourceType.includes("patrimoine") || family.includes("patrimoine");
      case "plage":
        return sourceType.includes("plage");
      case "rando":
        return sourceType.includes("rando");
      case "village":
        return category.includes("village") || family.includes("village");
    }
  });
}

function allLieux(): LieuCentralRow[] {
  const raw = lieuxRaw as { lieux: LieuCentralRow[] };
  return Array.isArray(raw.lieux) ? raw.lieux : [];
}

function withCoords(l: LieuCentralRow): boolean {
  return typeof l.lat === "number" && typeof l.lng === "number";
}

function sortByScore(list: LieuCentralRow[]): LieuCentralRow[] {
  return [...list].sort((a, b) => lieuCompositeScore(b) - lieuCompositeScore(a));
}

/**
 * GET ?regionId=bretagne&ambiance=mer&ambiance=patrimoine&zoom=8
 * Retourne les meilleurs lieux (score) pour la carte, en nombre 5–8 selon zoom.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const regionId = searchParams.get("regionId")?.trim();
  if (!regionId) {
    return NextResponse.json({ error: "regionId requis" }, { status: 400 });
  }

  const ambiances = parseAmbiances(searchParams);
  const poiTypes = parsePoiTypes(searchParams);
  const zoomRaw = searchParams.get("zoom");
  const zoom = zoomRaw != null ? Number.parseFloat(zoomRaw) : 8;
  const variant = searchParams.get("variant") ?? "map";

  let limit: number;
  if (variant === "gallery") {
    const gl = Number.parseInt(searchParams.get("galleryLimit") ?? "24", 10);
    limit = Math.min(48, Math.max(8, Number.isNaN(gl) ? 24 : gl));
  } else {
    const limitParam = searchParams.get("limit");
    limit =
      limitParam != null && !Number.isNaN(Number.parseInt(limitParam, 10))
        ? Math.min(12, Math.max(5, Number.parseInt(limitParam, 10)))
        : villePointLimitForZoom(Number.isFinite(zoom) ? zoom : 8);
  }

  const lieux = allLieux();
  const inRegion = filterLieuxByMapRegion(lieux, regionId).filter(withCoords);
  /** Lieux avec coords dans la région — peuvent recevoir une URL via /api/photo-resolve (slug lieu). */
  const lieuxPoiEligiblePhoto = inRegion.length;

  const filtered =
    ambiances.length === 0
      ? inRegion.filter((l) => lieuMatchesPoiTypes(l, poiTypes))
      : inRegion.filter(
          (l) =>
            lieuMatchesAmbianceFilters(l, ambiances) &&
            lieuMatchesPoiTypes(l, poiTypes)
        );

  let picked = sortByScore(filtered);
  const minWant = variant === "gallery" ? Math.min(8, limit) : Math.min(5, limit);
  if (picked.length < minWant && ambiances.length > 0) {
    const ids = new Set(picked.map((l) => l.slug));
    const pad = sortByScore(inRegion.filter((l) => !ids.has(l.slug)));
    picked = [...picked, ...pad].slice(0, limit);
  } else {
    picked = picked.slice(0, limit);
  }

  const slim = picked.map((l) => ({
    slug: l.slug,
    nom: l.nom,
    code_dep: l.code_dep,
    departement: l.departement ?? "",
    source_type: l.source_type ?? "",
    lat: l.lat as number,
    lng: l.lng as number,
    description_courte: (l.description_courte ?? "").slice(0, 220),
    score: Math.round(lieuCompositeScore(l)),
  }));

  return NextResponse.json(
    {
      regionId,
      limit,
      zoom: Number.isFinite(zoom) ? zoom : null,
      ambiances,
      poiTypes,
      count: slim.length,
      lieux: slim,
      stats: {
        lieuxPoiEligiblePhoto,
        returned: slim.length,
      },
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
  );
}
