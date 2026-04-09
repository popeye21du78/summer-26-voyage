/**
 * GET /api/commons-photos?slug=domme
 * - Lieux « premium » (9–10, châteaux remarquables, liste éditoriale) : **Unsplash** (header + blocs ---PHOTOS---).
 * - Autres lieux avec fiche : **Wikipédia** (images d’article) puis **Commons** (géo / texte) — pas de dossier `photos/` requis.
 * - Sinon : `commons-candidates.json` ou appel Commons live si dossier `photos/` + description.
 */
import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { getDescriptionForSlug, getPhotoSlotsFromDescription } from "../../../lib/description-lieu";
import { getLieuBySlug } from "../../../lib/lieux-central";
import type { LieuPoint } from "../../../lib/lieux-types";
import { isPremiumPatrimoineSlug } from "../../../lib/maintenance-photo-queue";
import { getBeautyCuratedPhotosForSlug } from "../../../lib/maintenance-beauty-validations";
import {
  fetchTopCommonsPhotos,
  fetchTopCommonsPhotosByGeo,
  delay,
  type CommonsPhoto,
} from "../../../lib/commons-api";
import {
  fetchUnsplashPhotosForCity,
  fetchUnsplashPhotosForQuery,
  type UnsplashResult,
} from "../../../lib/unsplash";
import { fetchStrategicHeaderPhotos } from "../../../lib/lieu-photos-strategic";

/** Rayon géo (m) : centre-ville uniquement, exclut Pont du Gard etc. */
const GEO_RADIUS_M = 4000;

function unsplashResultsToCommonsPhotos(results: UnsplashResult[]): CommonsPhoto[] {
  return results.map((u, i) => ({
    url: u.url,
    sourceUrl: u.sourceUrl ?? "https://unsplash.com",
    title: (u.alt || "Photo").slice(0, 200),
    description: undefined,
    width: 1200,
    height: 800,
    size: 0,
    timestamp: new Date().toISOString(),
    author: u.credit ? `${u.credit} / Unsplash` : "Unsplash",
    license: "Unsplash License",
    licenseUrl: "https://unsplash.com/license",
    score: 100 - i,
  }));
}

/** Récupère 3 photos header Commons : géolocalisation si coords, sinon recherche texte. */
async function fetchHeaderPhotos(
  lieu: LieuPoint | null,
  nom: string,
  targetCount: number
): Promise<CommonsPhoto[]> {
  if (lieu?.lat != null && lieu?.lng != null) {
    const byGeo = await fetchTopCommonsPhotosByGeo(
      lieu.lat,
      lieu.lng,
      GEO_RADIUS_M,
      targetCount
    );
    if (byGeo.length >= targetCount) return byGeo;
  }

  const fallback = `${nom}`;
  return fetchTopCommonsPhotos(fallback, targetCount);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ error: "slug requis" }, { status: 400 });
  }

  const lieu = getLieuBySlug(slug);
  const nom = lieu?.nom ?? slug.replace(/-/g, " ");
  const description = getDescriptionForSlug(slug);
  const premium = isPremiumPatrimoineSlug(slug);

  /** Top 200 : photos choisies dans l’onglet maintenance (priorité sur Unsplash auto / Commons). */
  const beautyCurated = getBeautyCuratedPhotosForSlug(slug, 10);
  if (beautyCurated?.length) {
    return NextResponse.json({
      slug,
      nom,
      header: beautyCurated.slice(0, 3),
      lieux: [] as { label: string; photos: CommonsPhoto[] }[],
      photoSource: "beauty_curated" as const,
    });
  }

  /** Premium + fiche descriptive : Unsplash uniquement (pas de dossier `photos/` requis). */
  if (premium && description) {
    try {
      const headerRaw = await fetchUnsplashPhotosForCity(nom, { max: 3, stepId: slug });
      const header = unsplashResultsToCommonsPhotos(headerRaw);
      const photoLieux = getPhotoSlotsFromDescription(description);
      const departement = lieu?.departement ?? "";
      const lieuxPhotos: { label: string; photos: CommonsPhoto[] }[] = [];

      for (const lieuLabel of photoLieux) {
        const q = departement ? `${lieuLabel} ${nom} ${departement}` : `${lieuLabel} ${nom} France`;
        const raw = await fetchUnsplashPhotosForQuery(q, 3, { cityName: nom, stepId: slug });
        lieuxPhotos.push({ label: lieuLabel, photos: unsplashResultsToCommonsPhotos(raw) });
        await delay(350);
      }

      return NextResponse.json({
        slug,
        nom,
        header,
        lieux: lieuxPhotos,
        photoSource: "unsplash" as const,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur Unsplash";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  /** Patrimoine non premium + fiche : défaut Wikipédia → Commons (villages confidentiels, pas Unsplash). */
  if (description && !premium) {
    const departement = lieu?.departement ?? "";
    try {
      const header = await fetchStrategicHeaderPhotos(lieu, nom, departement || undefined, 3);
      const photoLieux = getPhotoSlotsFromDescription(description);
      const lieuxPhotos: { label: string; photos: CommonsPhoto[] }[] = [];

      for (const lieuLabel of photoLieux) {
        const lieuQuery = departement ? `${lieuLabel} ${nom}` : `${lieuLabel} ${nom} France`;
        const photos = await fetchTopCommonsPhotos(lieuQuery, 3);
        lieuxPhotos.push({ label: lieuLabel, photos });
        await delay(350);
      }

      return NextResponse.json({
        slug,
        nom,
        header,
        lieux: lieuxPhotos,
        photoSource: "wiki_commons_strategic" as const,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur Wikipédia / Commons";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  const photosDir = join(process.cwd(), "photos", slug);
  if (!existsSync(photosDir)) {
    return NextResponse.json(
      { error: "Dossier photos inexistant pour ce lieu" },
      { status: 404 }
    );
  }

  const candidatesPath = join(photosDir, "commons-candidates.json");
  if (existsSync(candidatesPath)) {
    try {
      const raw = readFileSync(candidatesPath, "utf-8");
      if (!raw?.trim()) throw new Error("Fichier vide");
      const cached = JSON.parse(raw) as {
        nom?: string;
        header?: CommonsPhoto[];
        lieux?: { label: string; photos: CommonsPhoto[] }[];
      };
      return NextResponse.json({
        slug,
        nom: cached.nom ?? nom,
        header: cached.header ?? [],
        lieux: cached.lieux ?? [],
        photoSource: "commons_cached" as const,
      });
    } catch {
      // fallback to API
    }
  }

  if (!description) {
    return NextResponse.json(
      { error: "Description inexistante" },
      { status: 404 }
    );
  }

  const departement = lieu?.departement ?? "";

  const photoLieux = getPhotoSlotsFromDescription(description);
  const headerPhotos: CommonsPhoto[] = [];
  const lieuxPhotos: { label: string; photos: CommonsPhoto[] }[] = [];

  try {
    headerPhotos.push(...(await fetchHeaderPhotos(lieu, nom, 3)));
    await delay(1000);

    for (const lieuLabel of photoLieux) {
      const lieuQuery = departement ? `${lieuLabel} ${nom}` : `${lieuLabel} ${nom} France`;
      const photos = await fetchTopCommonsPhotos(lieuQuery, 3);
      lieuxPhotos.push({ label: lieuLabel, photos });
      await delay(1000);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur Commons API";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({
    slug,
    nom,
    header: headerPhotos,
    lieux: lieuxPhotos,
    photoSource: "commons_live" as const,
  });
}
