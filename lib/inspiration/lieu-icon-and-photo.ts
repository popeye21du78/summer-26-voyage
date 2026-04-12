import type { LieuCentralRow } from "@/lib/inspiration-lieux-region";
import { getBeautyCuratedPhotosForSlug } from "@/lib/maintenance-beauty-validations";

/** Clés pour pictos (Lucide) côté UI. */
export type LieuIconKey =
  | "ville"
  | "village"
  | "plage"
  | "patrimoine"
  | "rando"
  | "nature"
  | "place";

export function mapLieuRowToIconKey(row: LieuCentralRow | undefined): LieuIconKey {
  if (!row) return "place";
  const st = `${row.source_type ?? ""} ${row.famille_type ?? ""}`.toLowerCase();
  if (st.includes("plage")) return "plage";
  if (st.includes("rando") || st.includes("montagne") || st.includes("massif")) return "rando";
  if (st.includes("patrimoine") || st.includes("château") || st.includes("chateau") || st.includes("musée") || st.includes("musee"))
    return "patrimoine";
  if (st.includes("ville")) return "ville";
  if (st.includes("village")) return "village";
  if (st.includes("nature") || st.includes("parc") || st.includes("lac")) return "nature";
  return "place";
}

/** Photo validée (beauty 200) si disponible. */
export function curatedPhotoUrlForSlug(slug: string): string | null {
  const list = getBeautyCuratedPhotosForSlug(slug.trim().toLowerCase(), 1);
  return list?.[0]?.url ?? null;
}
