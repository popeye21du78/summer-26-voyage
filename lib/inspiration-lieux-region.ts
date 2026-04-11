import { MAP_REGIONS, mapRegionById } from "@/lib/inspiration-map-regions-config";

export type LieuCentralRow = {
  source_type?: string;
  code_dep: string;
  departement?: string;
  nom: string;
  slug: string;
  lat?: number;
  lng?: number;
  description_courte?: string;
  tags_cadre?: string;
  categorie_taille?: string;
  famille_type?: string;
  score_esthetique?: string;
  score_notoriete?: string;
};

function padDep(code: string): string {
  const u = String(code).trim().toUpperCase();
  if (u === "2A" || u === "2B") return u;
  return u.padStart(2, "0");
}

/** Filtre les lieux du JSON central dont le département appartient à la région carte. */
export function filterLieuxByMapRegion(
  lieux: LieuCentralRow[],
  regionId: string
): LieuCentralRow[] {
  const def = mapRegionById(regionId);
  if (!def) return [];
  const allow = new Set(def.deptCodes.map(padDep));
  return lieux.filter((l) => {
    const c = padDep(l.code_dep || "");
    return allow.has(c);
  });
}

export function lieuxCountsByType(lieux: LieuCentralRow[]): {
  patrimoine: number;
  plage: number;
  rando: number;
  other: number;
} {
  let patrimoine = 0;
  let plage = 0;
  let rando = 0;
  let other = 0;
  for (const l of lieux) {
    const t = (l.source_type || "").toLowerCase();
    if (t.includes("patrimoine") || t === "patrimoine") patrimoine++;
    else if (t.includes("plage") || t === "plage") plage++;
    else if (t.includes("rando") || t === "rando") rando++;
    else other++;
  }
  return { patrimoine, plage, rando, other };
}
