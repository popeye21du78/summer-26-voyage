import lieuxRaw from "@/data/cities/lieux-central.json";
import {
  filterLieuxByMapRegion,
  type LieuCentralRow,
} from "@/lib/inspiration-lieux-region";
import { mapRegionById } from "@/lib/inspiration-map-regions-config";
import { getBeautyCuratedPhotosForSlug } from "@/lib/maintenance-beauty-validations";

/**
 * URLs de photos validées (beauty) pour une région, ordre stable (lieux du JSON).
 * Optionnellement restreint à une liste de slugs (ex. étapes d’un voyage).
 */
export function listCuratedPhotoUrlsForRegion(
  regionId: string,
  slugFilter?: Set<string>
): string[] {
  if (!mapRegionById(regionId)) return [];
  const lieux = filterLieuxByMapRegion(
    (lieuxRaw as { lieux: LieuCentralRow[] }).lieux ?? [],
    regionId
  );
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const l of lieux) {
    if (!l.slug) continue;
    if (slugFilter && !slugFilter.has(l.slug)) continue;
    const photos = getBeautyCuratedPhotosForSlug(l.slug, 3);
    if (!photos?.length) continue;
    for (const p of photos) {
      if (!seen.has(p.url)) {
        seen.add(p.url);
        urls.push(p.url);
      }
    }
  }
  return urls;
}
