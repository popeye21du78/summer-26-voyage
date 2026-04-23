import type { InspirationAmbianceFilter } from "@/lib/editorial-territories";
import type { LieuCentralRow } from "@/lib/inspiration-lieux-region";

type LieuExt = LieuCentralRow;

/** Score de tri (esthétique prioritaire, puis notoriété). */
export function lieuCompositeScore(l: LieuExt): number {
  const est = parseFloat(String(l.score_esthetique ?? "0")) || 0;
  const noto = parseFloat(String(l.score_notoriete ?? "0")) || 0;
  return est * 100 + noto;
}

function deriveAmbianceTags(l: LieuExt): Set<InspirationAmbianceFilter> {
  const out = new Set<InspirationAmbianceFilter>();
  const st = (l.source_type || "").toLowerCase();
  const tags = (l.tags_cadre || "").toLowerCase();
  const cat = (l.categorie_taille || "").toLowerCase();
  const fam = (l.famille_type || "").toLowerCase();

  if (st.includes("plage") || tags.includes("littoral") || tags.includes("mer")) out.add("mer");
  if (st.includes("patrimoine") || fam.includes("patrimoine")) out.add("patrimoine");
  if (cat.includes("village") || fam.includes("village") || /\bvillage\b/i.test(l.nom || "")) {
    out.add("villages");
  }
  if (
    st.includes("rando") ||
    tags.includes("montagne") ||
    tags.includes("foret") ||
    tags.includes("moyenne_montagne") ||
    tags.includes("garrigue")
  ) {
    out.add("nature");
  }
  /** Haltes « voyage » : patrimoine, littoral ou villes plus structurantes. */
  if (
    st.includes("patrimoine") ||
    st.includes("plage") ||
    cat.includes("ville") ||
    cat.includes("grande")
  ) {
    out.add("road_trip");
  }
  const noto = parseInt(String(l.score_notoriete ?? "5"), 10) || 5;
  if (noto <= 5) out.add("moins_connu");

  return out;
}

/** Si aucun filtre, tout passe. Sinon chaque filtre sélectionné doit être satisfait. */
export function lieuMatchesAmbianceFilters(
  l: LieuCentralRow,
  filters: InspirationAmbianceFilter[]
): boolean {
  if (filters.length === 0) return true;
  const derived = deriveAmbianceTags(l);
  return filters.every((f) => derived.has(f));
}

/** Nombre de points carte en fonction du zoom Mapbox sur la région.
 * Progression lissée pour éviter les sauts trop visibles entre deux niveaux de zoom.
 */
export function villePointLimitForZoom(zoom: number): number {
  const z = Math.max(5.5, Math.min(11, zoom));
  const minZoom = 5.5;
  const maxZoom = 11;
  const minPoints = 5;
  const maxPoints = 38;

  const t = (z - minZoom) / (maxZoom - minZoom);
  const smooth = t * t * (3 - 2 * t);
  const points = minPoints + smooth * (maxPoints - minPoints);

  return Math.round(points);
}
