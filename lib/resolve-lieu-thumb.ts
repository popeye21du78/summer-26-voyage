import { fetchTopCommonsPhotos } from "./commons-api";
import { getLieuBySlug } from "./lieux-central";
import { isPremiumPatrimoineSlug } from "./maintenance-photo-queue";
import { getPublicPhotoPick } from "./public-photo-url";
import { slugFromNom } from "./slug-from-nom";
import { fetchPhotoForCity, fetchUnsplashPhotosForCity } from "./unsplash";
import { fetchPhotoForCityFromWikipedia } from "./wikipedia-photo";

export type LieuThumbSource =
  | "beauty_curated"
  | "maintenance_validated"
  | "unsplash"
  | "wikipedia"
  | "commons"
  | "unsplash_fallback";

export type LieuThumbResult = {
  url: string;
  alt: string;
  credit: string;
  source: LieuThumbSource;
  premiumPatrimoine: boolean;
};

/**
 * Une vignette lieu (validations, puis Wikipédia / Commons / Unsplash) — même logique que GET /api/photo-lieu.
 */
export async function resolveLieuThumb(
  villeInput: string,
  slugHint?: string
): Promise<LieuThumbResult | null> {
  const ville = villeInput.trim();
  if (!ville) return null;

  const slug = slugHint?.trim().toLowerCase() || slugFromNom(ville);
  const premium = isPremiumPatrimoineSlug(slug);
  const lieuRow = getLieuBySlug(slug);
  const departement = lieuRow?.departement?.trim() || undefined;

  const sitePick = await getPublicPhotoPick(slug, slug, 0);
  if (sitePick) {
    return {
      url: sitePick.url,
      alt: ville,
      credit: sitePick.source === "beauty_curated" ? "Sélection Viago" : "Photo validée",
      source: sitePick.source,
      premiumPatrimoine: premium,
    };
  }

  if (premium) {
    const list = await fetchUnsplashPhotosForCity(ville, { max: 3, stepId: slug });
    const one = list[0] ?? (await fetchPhotoForCity(ville, { stepId: slug }));
    if (!one) return null;
    return {
      url: one.url,
      alt: one.alt,
      credit: one.credit ? `${one.credit} / Unsplash` : "Unsplash",
      source: "unsplash",
      premiumPatrimoine: true,
    };
  }

  const wiki = await fetchPhotoForCityFromWikipedia(ville, { departement });
  if (wiki) {
    return {
      url: wiki.url,
      alt: wiki.alt,
      credit: wiki.credit,
      source: "wikipedia",
      premiumPatrimoine: false,
    };
  }

  const commons = await fetchTopCommonsPhotos(`${ville} France`, 1);
  const c0 = commons[0];
  if (c0) {
    return {
      url: c0.url,
      alt: ville,
      credit: c0.author,
      source: "commons",
      premiumPatrimoine: false,
    };
  }

  const result = await fetchPhotoForCity(ville);
  if (!result) return null;
  return {
    url: result.url,
    alt: result.alt,
    credit: result.credit ?? "Unsplash",
    source: "unsplash_fallback",
    premiumPatrimoine: false,
  };
}
