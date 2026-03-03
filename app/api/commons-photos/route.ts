/**
 * GET /api/commons-photos?slug=domme
 * Récupère les 3 meilleures photos Commons pour le header et chaque lieu (---PHOTOS---).
 * Requêtes header adaptées au type de lieu + cascade fallback.
 */
import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";
import { getDescriptionForSlug, getPhotoSlotsFromDescription } from "../../../lib/description-lieu";
import { getLieuBySlug } from "../../../lib/lieux-central";
import type { LieuPoint } from "../../../lib/lieux-types";
import {
  fetchTopCommonsPhotos,
  fetchTopCommonsPhotosByGeo,
  delay,
  type CommonsPhoto,
} from "../../../lib/commons-api";

/** Rayon géo (m) : centre-ville uniquement, exclut Pont du Gard etc. */
const GEO_RADIUS_M = 4000;

/** Récupère 3 photos header : géolocalisation si coords, sinon recherche texte. */
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
  const slug = searchParams.get("slug")?.trim();

  if (!slug) {
    return NextResponse.json({ error: "slug requis" }, { status: 400 });
  }

  const photosDir = join(process.cwd(), "photos", slug);
  if (!existsSync(photosDir)) {
    return NextResponse.json(
      { error: "Dossier photos inexistant pour ce lieu" },
      { status: 404 }
    );
  }

  const description = getDescriptionForSlug(slug);
  if (!description) {
    return NextResponse.json(
      { error: "Description inexistante" },
      { status: 404 }
    );
  }

  const lieu = getLieuBySlug(slug);
  const nom = lieu?.nom ?? slug.replace(/-/g, " ");
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
  });
}
