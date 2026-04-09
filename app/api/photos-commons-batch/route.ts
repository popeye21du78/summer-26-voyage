/**
 * POST /api/photos-commons-batch?count=5
 * Traite un lot de lieux : récupère les photos Commons et stocke dans commons-candidates.json.
 * Peut être appelé en boucle pour traiter tout le batch par chunks.
 */
import { NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const CACHE_FILE = join(process.cwd(), "data", "wikimedia-status.json");

function writeStatusCache(total: number, done: number) {
  try {
    writeFileSync(
      CACHE_FILE,
      JSON.stringify({ total, done, remaining: Math.max(0, total - done), updatedAt: new Date().toISOString() }),
      "utf-8"
    );
  } catch {
    /* ignore */
  }
}
import { getDescriptionForSlug, getPhotoSlotsFromDescription } from "../../../lib/description-lieu";
import {
  fetchTopCommonsPhotos,
  fetchTopCommonsPhotosByGeo,
  delay,
  type CommonsPhoto,
} from "../../../lib/commons-api";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const PHOTOS_ROOT = join(process.cwd(), "photos");
const LIEUX_JSON = join(process.cwd(), "data", "cities", "lieux-central.json");
const GEO_RADIUS_M = 4000;
const DELAY_MS = 1200;

interface LieuFromJson {
  slug?: string;
  nom?: string;
  lat?: number;
  lng?: number;
  departement?: string;
}

function getLieuBySlug(slug: string): LieuFromJson | null {
  try {
    if (!existsSync(LIEUX_JSON)) return null;
    const raw = readFileSync(LIEUX_JSON, "utf-8");
    const data = JSON.parse(raw) as { lieux?: LieuFromJson[] };
    const lieux = data.lieux ?? [];
    const s = slug.toLowerCase().trim();
    return lieux.find((l) => (l.slug ?? "").toLowerCase() === s) ?? null;
  } catch {
    return null;
  }
}

function getNomKeywords(nom: string): string[] {
  const stop = new Set(["le", "la", "les", "de", "du", "des", "et", "en", "sur", "au", "aux", "à", "l", "d"]);
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[\s\-']+/)
    .filter((w) => w.length >= 2 && !stop.has(w));
}

function titleMatchesNom(title: string, nomKeywords: string[]): boolean {
  const t = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return nomKeywords.some((kw) => t.includes(kw));
}

async function fetchHeaderPhotos(
  lieu: LieuFromJson | null,
  nom: string,
  departement: string,
  targetCount: number
): Promise<CommonsPhoto[]> {
  const nomKeywords = getNomKeywords(nom);
  let candidates: CommonsPhoto[] = [];

  if (typeof lieu?.lat === "number" && typeof lieu?.lng === "number" && !Number.isNaN(lieu.lat) && !Number.isNaN(lieu.lng)) {
    const byGeo = await fetchTopCommonsPhotosByGeo(lieu.lat, lieu.lng, GEO_RADIUS_M, 30);
    const matching = byGeo.filter((p) => titleMatchesNom(p.title, nomKeywords));
    const other = byGeo.filter((p) => !titleMatchesNom(p.title, nomKeywords));
    candidates = [...matching, ...other];
  }

  if (candidates.length < targetCount) {
    await delay(DELAY_MS);
    const byText = await fetchTopCommonsPhotos(`${nom} France`, 15);
    const seen = new Set(candidates.map((p) => p.url));
    for (const p of byText) {
      if (!seen.has(p.url)) {
        seen.add(p.url);
        candidates.push(p);
      }
    }
  }

  if (candidates.length < targetCount && departement) {
    await delay(DELAY_MS);
    const byDept = await fetchTopCommonsPhotos(`${nom} ${departement}`, 10);
    const seen = new Set(candidates.map((p) => p.url));
    for (const p of byDept) {
      if (!seen.has(p.url)) {
        seen.add(p.url);
        candidates.push(p);
      }
    }
  }

  return candidates.slice(0, targetCount);
}

function getSlugsToProcess(count: number): string[] {
  if (!existsSync(PHOTOS_ROOT)) return [];
  const entries = readdirSync(PHOTOS_ROOT, { withFileTypes: true });
  const slugs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort()
    .filter((slug) => !existsSync(join(PHOTOS_ROOT, slug, "commons-candidates.json")));
  return slugs.slice(0, count);
}

/** GET /api/photos-commons-batch — Statut du batch (combien faits, restants) */
export async function GET() {
  if (!existsSync(PHOTOS_ROOT)) {
    return NextResponse.json({ total: 0, done: 0, remaining: 0 });
  }
  const entries = readdirSync(PHOTOS_ROOT, { withFileTypes: true });
  const total = entries.filter((e) => e.isDirectory() && !e.name.startsWith(".")).length;
  let done = 0;
  for (const e of entries) {
    if (e.isDirectory() && existsSync(join(PHOTOS_ROOT, e.name, "commons-candidates.json"))) {
      done++;
    }
  }
  return NextResponse.json({ total, done, remaining: total - done });
}

export async function POST(req: NextRequest) {
  const count = Math.min(20, Math.max(1, parseInt(req.nextUrl.searchParams.get("count") ?? "5", 10)));

  const slugs = getSlugsToProcess(count);
  if (slugs.length === 0) {
    return NextResponse.json({
      processed: 0,
      total: 0,
      remaining: 0,
      message: "Aucun lieu à traiter (tous ont déjà commons-candidates.json)",
    });
  }

  const results: { slug: string; ok: boolean; error?: string }[] = [];
  const totalWithFolders = readdirSync(PHOTOS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith(".")).length;

  for (const slug of slugs) {
    const description = getDescriptionForSlug(slug);
    if (!description) {
      results.push({ slug, ok: false, error: "Pas de description" });
      continue;
    }

    const lieu = getLieuBySlug(slug);
    const nom = lieu?.nom ?? slug.replace(/-/g, " ");
    const departement = lieu?.departement ?? "";
    const photoLieux = getPhotoSlotsFromDescription(description);

    try {
      const headerPhotos = await fetchHeaderPhotos(lieu, nom, departement, 3);
      await delay(DELAY_MS);

      const lieuxPhotos: { label: string; photos: CommonsPhoto[] }[] = [];
      for (const lieuLabel of photoLieux) {
        const lieuQuery = departement ? `${lieuLabel} ${nom}` : `${lieuLabel} ${nom} France`;
        const photos = await fetchTopCommonsPhotos(lieuQuery, 3);
        lieuxPhotos.push({ label: lieuLabel, photos });
        await delay(DELAY_MS);
      }

      const output = {
        slug,
        nom,
        fetchedAt: new Date().toISOString(),
        header: headerPhotos,
        lieux: lieuxPhotos,
      };

      writeFileSync(join(PHOTOS_ROOT, slug, "commons-candidates.json"), JSON.stringify(output, null, 2), "utf-8");
      results.push({ slug, ok: true });
      const remaining = getSlugsToProcess(9999).length;
      writeStatusCache(totalWithFolders, totalWithFolders - remaining);
    } catch (err) {
      results.push({ slug, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const remaining = getSlugsToProcess(9999).length;

  return NextResponse.json({
    processed: results.filter((r) => r.ok).length,
    errors: results.filter((r) => !r.ok).length,
    results,
    remaining,
    totalWithFolders,
    message: `${results.filter((r) => r.ok).length} traités, ${remaining} restants`,
  });
}
