/**
 * Une feature par région : union des départements (un seul contour extérieur par zone),
 * sans traits internes départementaux. Couleurs #hex + bordures multicolores (palette marque).
 *
 * npx tsx scripts/build-inspiration-poi-sectors.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as turf from "@turf/turf";
import { union } from "polygon-clipping";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson";
import { MAP_REGIONS, mapRegionIdForDeptCode } from "../lib/inspiration-map-regions-config";
import { borderHexForRegionIndex, vividFillHex } from "../lib/voyage-map-palette";

const ROOT = path.join(__dirname, "..");
const DEPTS_PATH = path.join(ROOT, "data", "geo", "departements-france.geojson");
const OUT_GEO = path.join(ROOT, "public", "geo", "inspiration-map-regions.geojson");
const OUT_OUTLINE = path.join(ROOT, "public", "geo", "inspiration-map-regions-outline.geojson");
const EDITORIAL_PATH = path.join(ROOT, "data", "editorial-territories.json");

const N_REGIONS = MAP_REGIONS.length;

function normDeptCode(props: Record<string, unknown>): string | null {
  const raw = props.code ?? props.code_departement ?? props.CODE_DEPT ?? props.insee;
  if (raw == null) return null;
  const s = String(raw).trim();
  if (/^2[ab]$/i.test(s)) return s.toUpperCase();
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && n >= 1 && n <= 95) return String(n).padStart(2, "0");
  if (/^\d{2,3}$/.test(s)) return s.padStart(2, "0").slice(-2);
  return null;
}

type PolyFeat = Feature<Polygon | MultiPolygon>;

function toPolyFeatures(geom: Polygon | MultiPolygon): PolyFeat[] {
  if (geom.type === "Polygon") {
    return [{ type: "Feature", properties: {}, geometry: geom }];
  }
  return geom.coordinates.map(
    (rings): PolyFeat => ({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: rings },
    })
  );
}

function asMultiCoords(geom: Polygon | MultiPolygon): Position[][][] {
  return geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
}

function mergeDeptFeatures(features: PolyFeat[]): Feature<MultiPolygon> | null {
  if (features.length === 0) return null;
  const flat = turf.flatten(turf.featureCollection(features));
  const rings: Position[][][] = [];
  for (const f of flat.features) {
    const g = f.geometry;
    if (g.type === "Polygon") rings.push(g.coordinates);
    else if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates) rings.push(poly);
    }
  }
  if (rings.length === 0) return null;
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "MultiPolygon", coordinates: rings },
  };
}

/** Union géométrique : un contour par région (plus de traits entre départements). */
function unionDeptFeatures(parts: PolyFeat[]): Polygon | MultiPolygon | null {
  if (parts.length === 0) return null;
  let acc = asMultiCoords(parts[0].geometry);
  for (let i = 1; i < parts.length; i++) {
    const next = asMultiCoords(parts[i].geometry);
    acc = union(acc, next) as Position[][][];
  }
  if (acc.length === 0) return null;
  if (acc.length === 1) {
    return { type: "Polygon", coordinates: acc[0] };
  }
  return { type: "MultiPolygon", coordinates: acc };
}

/** Secours : enchaîne @turf/union (souvent plus tolérant que polygon-clipping seul sur les données IGN). */
function turfCascadeUnion(parts: PolyFeat[]): Polygon | MultiPolygon | null {
  if (parts.length === 0) return null;
  let merged: Feature<Polygon | MultiPolygon> = {
    type: "Feature",
    properties: {},
    geometry: parts[0].geometry,
  };
  for (let i = 1; i < parts.length; i++) {
    const next: Feature<Polygon | MultiPolygon> = {
      type: "Feature",
      properties: {},
      geometry: parts[i].geometry,
    };
    const u = turf.union(merged, next);
    const g = u?.geometry;
    if (g && (g.type === "Polygon" || g.type === "MultiPolygon")) {
      merged = u as Feature<Polygon | MultiPolygon>;
    }
  }
  return merged.geometry;
}

/** Contours pour couche line Mapbox (traits épais, sans traits internes départements). */
function lineFeaturesFromRegionPolygon(
  props: Record<string, unknown>,
  geometry: Polygon | MultiPolygon
): Feature<LineString | MultiLineString>[] {
  const feat: Feature<Polygon | MultiPolygon> = {
    type: "Feature",
    properties: props,
    geometry,
  };
  const pl = turf.polygonToLine(feat);
  if (!pl) return [];

  if (pl.type === "FeatureCollection") {
    return pl.features.map((f, i) => ({
      type: "Feature" as const,
      properties: { ...props, ...(f.properties ?? {}), _outlinePart: i },
      geometry: f.geometry as LineString | MultiLineString,
    }));
  }

  if (pl.type === "Feature" && pl.geometry) {
    const g = pl.geometry;
    if (g.type === "GeometryCollection") {
      const out: Feature<LineString | MultiLineString>[] = [];
      for (let i = 0; i < g.geometries.length; i++) {
        const geom = g.geometries[i];
        if (geom.type !== "LineString" && geom.type !== "MultiLineString") continue;
        out.push({
          type: "Feature",
          properties: { ...props, _outlinePart: i },
          geometry: geom,
        });
      }
      return out;
    }
    if (g.type === "LineString" || g.type === "MultiLineString") {
      return [{ type: "Feature", properties: props, geometry: g }];
    }
  }

  return [];
}

function main() {
  const t0 = Date.now();
  if (!fs.existsSync(DEPTS_PATH)) {
    console.error(`Manque ${DEPTS_PATH}`);
    process.exit(1);
  }

  const deptsFc = JSON.parse(fs.readFileSync(DEPTS_PATH, "utf8")) as FeatureCollection;
  const byRegion = new Map<string, PolyFeat[]>();

  for (const f of deptsFc.features) {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const code = normDeptCode(props);
    if (!code) continue;
    const regionId = mapRegionIdForDeptCode(code);
    if (!regionId) continue;
    const g = f.geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) continue;
    const list = byRegion.get(regionId) ?? [];
    list.push(...toPolyFeatures(g));
    byRegion.set(regionId, list);
  }

  const outFeatures: Feature<Polygon | MultiPolygon>[] = [];
  const outlineFeatures: Feature<LineString | MultiLineString>[] = [];
  MAP_REGIONS.forEach((def, idx) => {
    const parts = byRegion.get(def.id) ?? [];
    let geometry: Polygon | MultiPolygon | null = null;
    try {
      geometry = unionDeptFeatures(parts);
    } catch {
      geometry = null;
    }
    if (!geometry) {
      try {
        geometry = turfCascadeUnion(parts);
      } catch {
        geometry = null;
      }
    }
    if (!geometry) {
      const merged = mergeDeptFeatures(parts);
      if (!merged) {
        console.warn(`Aucune géométrie pour ${def.id}`);
        return;
      }
      geometry = merged.geometry;
      console.warn(`Union échouée pour ${def.id}, fallback MultiPolygon empilé`);
    }
    const color = vividFillHex(idx, N_REGIONS);
    const borderColor = borderHexForRegionIndex(idx);
    const props = {
      id: def.id,
      name: def.name,
      color,
      borderColor,
    };
    outFeatures.push({
      type: "Feature",
      properties: props,
      geometry,
    });
    outlineFeatures.push(...lineFeaturesFromRegionPolygon(props, geometry));
  });

  fs.mkdirSync(path.dirname(OUT_GEO), { recursive: true });
  fs.writeFileSync(
    OUT_GEO,
    JSON.stringify({ type: "FeatureCollection", features: outFeatures }),
    "utf8"
  );
  fs.writeFileSync(
    OUT_OUTLINE,
    JSON.stringify({ type: "FeatureCollection", features: outlineFeatures }),
    "utf8"
  );

  const editorial = JSON.parse(fs.readFileSync(EDITORIAL_PATH, "utf8")) as {
    territories: Array<Record<string, unknown>>;
  };

  const deptFeatArray = [...deptsFc.features]
    .map((f) => {
      const props = (f.properties ?? {}) as Record<string, unknown>;
      const code = normDeptCode(props);
      if (!code || !mapRegionIdForDeptCode(code)) return null;
      const g = f.geometry;
      if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) return null;
      return { code, feat: f as Feature<Polygon | MultiPolygon> };
    })
    .filter((x): x is { code: string; feat: Feature<Polygon | MultiPolygon> } => x != null);

  const deptList = [...new Set(deptFeatArray.map((x) => x.code))];

  for (const t of editorial.territories) {
    const center = t.center as [number, number];
    const pt = turf.point(center);
    let dept: string | null = null;
    for (const { code, feat } of deptFeatArray) {
      if (turf.booleanPointInPolygon(pt, feat)) {
        dept = code;
        break;
      }
    }
    if (!dept) {
      let best = deptList[0];
      let bestD = Number.POSITIVE_INFINITY;
      for (const d of deptList) {
        const row = deptFeatArray.find((x) => x.code === d);
        if (!row) continue;
        const c = turf.centroid(row.feat);
        const dx = c.geometry.coordinates[0] - center[0];
        const dy = c.geometry.coordinates[1] - center[1];
        const dist = dx * dx + dy * dy;
        if (dist < bestD) {
          bestD = dist;
          best = d;
        }
      }
      dept = best;
    }
    t.poi_sector_id = mapRegionIdForDeptCode(dept) ?? MAP_REGIONS[0].id;
  }

  fs.writeFileSync(EDITORIAL_PATH, JSON.stringify(editorial, null, 2) + "\n", "utf8");

  console.log(
    `OK ${outFeatures.length} régions → ${OUT_GEO} + ${outlineFeatures.length} contours → ${OUT_OUTLINE} (${Date.now() - t0} ms)`
  );
}

main();
