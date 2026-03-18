/**
 * Batch : récupère les photos Wikimedia Commons pour tous les lieux ayant un dossier photos/.
 * Stocke les candidats dans photos/{slug}/commons-candidates.json.
 *
 * Usage :
 *   npx tsx scripts/fetch-commons-photos-batch.ts
 *   npx tsx scripts/fetch-commons-photos-batch.ts --limit 10     (test sur 10 lieux)
 *   npx tsx scripts/fetch-commons-photos-batch.ts --skip 50      (reprendre après les 50 premiers)
 *   npx tsx scripts/fetch-commons-photos-batch.ts --force        (réécrire même si déjà fait)
 *   npx tsx scripts/fetch-commons-photos-batch.ts --from beauvais (reprendre à partir de Beauvais)
 *
 * Lance en arrière-plan : npx tsx scripts/fetch-commons-photos-batch.ts > photos-batch.log 2>&1 &
 * (ou sur Windows : Start-Process -NoNewWindow npx tsx scripts/fetch-commons-photos-batch.ts)
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { getDescriptionForSlug, getPhotoSlotsFromDescription } from "../lib/description-lieu";
import {
  fetchTopCommonsPhotos,
  fetchTopCommonsPhotosByGeo,
  delay,
  type CommonsPhoto,
} from "../lib/commons-api";

const PHOTOS_ROOT = join(process.cwd(), "photos");
const LIEUX_JSON = join(process.cwd(), "data", "cities", "lieux-central.json");
const CACHE_FILE = join(process.cwd(), "data", "wikimedia-status.json");
const GEO_RADIUS_M = 4000;
const DELAY_MS = 500;

function writeStatusCache(total: number, done: number) {
  try {
    const dir = dirname(CACHE_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(
      CACHE_FILE,
      JSON.stringify({ total, done, remaining: Math.max(0, total - done), updatedAt: new Date().toISOString() }),
      "utf-8"
    );
  } catch {
    /* ignore */
  }
}

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

/** Mots significatifs du nom (exclut articles, prépositions). */
function getNomKeywords(nom: string): string[] {
  const stop = new Set(["le", "la", "les", "de", "du", "des", "et", "en", "sur", "au", "aux", "à", "l", "d"]);
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[\s\-']+/)
    .filter((w) => w.length >= 2 && !stop.has(w));
}

/** Vérifie si le titre de la photo évoque le lieu (évite Nanterre pour Villa Savoye). */
function titleMatchesNom(title: string, nomKeywords: string[]): boolean {
  const t = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return nomKeywords.some((kw) => t.includes(kw));
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = String(e instanceof Error ? e.message : e);
      const isRetryable = /429|503|502|ECONNRESET|ETIMEDOUT|fetch failed/i.test(msg);
      if (attempt < MAX_RETRIES && isRetryable) {
        console.warn(`    ⚠ Tentative ${attempt}/${MAX_RETRIES} échouée, retry dans ${RETRY_DELAY_MS / 1000}s…`);
        await delay(RETRY_DELAY_MS);
      } else {
        throw e;
      }
    }
  }
  throw lastErr;
}

/** Requêtes header : "nom" seul d'abord (ex. Belvès), puis "nom France" / "nom département" pour homonymes. */
function buildHeaderQuery(nom: string, departement: string): string[] {
  const queries: string[] = [nom];
  if (departement) queries.push(`${nom} ${departement}`);
  queries.push(`${nom} France`);
  return queries;
}

/** Mot-clé simple : ce qu'on taperait dans la barre Commons (Belvès halle, Belvès tour, etc.). */
function getSimpleKeyword(label: string): string {
  const l = label.toLowerCase();
  if (/cathédrale/i.test(l)) return "cathédrale";
  if (/église/i.test(l)) return "église";
  if (/abbaye/i.test(l)) return "abbaye";
  if (/abbatiale/i.test(l)) return "abbatiale";
  if (/chapelle/i.test(l)) return "chapelle";
  if (/place/i.test(l)) return "place";
  if (/rue/i.test(l)) return "rue";
  if (/remparts/i.test(l)) return "remparts";
  if (/halle/i.test(l)) return "halle";
  if (/pont|bridge/i.test(l)) return "pont";
  if (/palais des papes/i.test(l)) return "palais";
  if (/tour/i.test(l)) return "tour";
  if (/château|chateau/i.test(l)) return "château";
  if (/hôtel de ville|hotel de ville/i.test(l)) return "hôtel de ville";
  if (/maisons|troglodytiques|pans de bois/i.test(l)) return "maisons";
  if (/port/i.test(l)) return "port";
  if (/ruelles|vieux village/i.test(l)) return "ruelles";
  if (/col |clairière|pierre/i.test(l)) return label.split(/[\s(]+/)[0]?.toLowerCase() || "vue";
  const first = label.split(/[\s(]+/)[0];
  return first?.toLowerCase() || label.slice(0, 30);
}

function buildLieuQuery(nom: string, label: string, departement: string): string[] {
  const labelLower = label.toLowerCase();
  const queries: string[] = [];
  if (/palais des papes/i.test(labelLower)) {
    queries.push(`Palais des papes Avignon`);
    queries.push(`${nom} palais`);
  } else {
    const keyword = getSimpleKeyword(label);
    queries.push(`${nom} ${keyword}`);
    if (keyword === "pont" && /loire/i.test(labelLower)) {
      queries.push(`${nom} pont Loire`);
    }
  }
  return queries;
}

async function fetchHeaderPhotos(
  lieu: LieuFromJson | null,
  nom: string,
  departement: string,
  targetCount: number
): Promise<CommonsPhoto[]> {
  const nomKeywords = getNomKeywords(nom);
  let candidates: CommonsPhoto[] = [];
  const seen = new Set<string>();

  /** Priorité géo si coordonnées : uniquement les photos dont le titre mentionne le lieu (évite Bouillac pour Belvès). */
  if (typeof lieu?.lat === "number" && typeof lieu?.lng === "number") {
    await delay(DELAY_MS);
    const byGeo = await withRetry(() =>
      fetchTopCommonsPhotosByGeo(lieu.lat!, lieu.lng!, 2000, 20)
    );
    for (const p of byGeo.filter((p) => titleMatchesNom(p.title, nomKeywords))) {
      if (!seen.has(p.url)) {
        seen.add(p.url);
        candidates.push(p);
      }
    }
  }

  /** Fallback texte : uniquement les photos dont le titre mentionne le lieu (évite "belve" italien pour Belvès). */
  if (candidates.length < targetCount) {
    const headerQueries = buildHeaderQuery(nom, departement);
    for (const q of headerQueries) {
      if (candidates.length >= targetCount * 2) break;
      await delay(DELAY_MS);
      const byText = await withRetry(() => fetchTopCommonsPhotos(q, 15));
      for (const p of byText.filter((p) => titleMatchesNom(p.title, nomKeywords))) {
        if (!seen.has(p.url)) {
          seen.add(p.url);
          candidates.push(p);
        }
      }
    }
  }


  return candidates.slice(0, targetCount);
}

function getSlugsWithPhotosFolder(): string[] {
  if (!existsSync(PHOTOS_ROOT)) return [];
  const entries = readdirSync(PHOTOS_ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const skipIdx = args.indexOf("--skip");
  const slugIdx = args.indexOf("--slug");
  const fromIdx = args.indexOf("--from");
  const force = args.includes("--force");

  const limit = limitIdx >= 0 && args[limitIdx + 1]
    ? parseInt(args[limitIdx + 1], 10)
    : undefined;
  let skip = skipIdx >= 0 && args[skipIdx + 1]
    ? parseInt(args[skipIdx + 1], 10)
    : 0;
  const slugArg = slugIdx >= 0 && args[slugIdx + 1] ? args[slugIdx + 1].trim() : null;
  const fromArg = fromIdx >= 0 && args[fromIdx + 1] ? args[fromIdx + 1].trim().toLowerCase() : null;

  const allSlugs = getSlugsWithPhotosFolder();
  if (fromArg && !slugArg) {
    const fromIndex = allSlugs.findIndex((s) => s.toLowerCase() === fromArg);
    if (fromIndex >= 0) skip = fromIndex;
  }
  let slugs = slugArg
    ? allSlugs.filter((s) => s.toLowerCase() === slugArg.toLowerCase())
    : allSlugs.slice(skip);
  if (!slugArg && limit != null && limit > 0) slugs = slugs.slice(0, limit);

  console.log(`\n📷 Batch photos Wikimedia Commons`);
  console.log(`   Dossiers photos : ${allSlugs.length}`);
  console.log(`   À traiter : ${slugs.length} (skip=${skip}${fromArg ? `, from=${fromArg}` : ""}${limit != null ? `, limit=${limit}` : ""})`);
  if (force) console.log(`   Mode : --force (réécriture)`);
  console.log(`   Délai entre requêtes : ${DELAY_MS}ms\n`);

  let done = 0;
  let errors = 0;

  let doneCount = 0;
  try {
    const cached = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, "utf-8")) : null;
    if (cached && typeof cached.done === "number") doneCount = cached.done;
  } catch {
    /* ignore */
  }
  if (doneCount === 0) {
    doneCount = allSlugs.filter((s) => existsSync(join(PHOTOS_ROOT, s, "commons-candidates.json"))).length;
  }
  writeStatusCache(allSlugs.length, doneCount);

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const candidatesPath = join(PHOTOS_ROOT, slug, "commons-candidates.json");

    if (!force && existsSync(candidatesPath)) {
      console.log(`[${i + 1}/${slugs.length}] ${slug} — déjà fait, skip`);
      done++;
      continue;
    }

    const description = getDescriptionForSlug(slug);
    if (!description) {
      console.log(`[${i + 1}/${slugs.length}] ${slug} — pas de description, skip`);
      continue;
    }

    const lieu = getLieuBySlug(slug);
    const nom = lieu?.nom ?? slug.replace(/-/g, " ");
    const departement = lieu?.departement ?? "";
    const photoLieux = getPhotoSlotsFromDescription(description);

    try {
      const headerPhotos = await fetchHeaderPhotos(lieu, nom, departement, 3);
      await delay(DELAY_MS);

      const nomKeywords = getNomKeywords(nom);
      const lieuxPhotos: { label: string; photos: CommonsPhoto[] }[] = [];
      for (const lieuLabel of photoLieux) {
        const queries = buildLieuQuery(nom, lieuLabel, departement);
        const allPhotos: CommonsPhoto[] = [];
        const seen = new Set<string>();
        for (const q of queries) {
          if (allPhotos.length >= 10) break;
          await delay(DELAY_MS);
          const photos = await withRetry(() => fetchTopCommonsPhotos(q, 15));
          for (const p of photos) {
            if (!seen.has(p.url) && titleMatchesNom(p.title, nomKeywords)) {
              seen.add(p.url);
              allPhotos.push(p);
            }
          }
        }
        lieuxPhotos.push({ label: lieuLabel, photos: allPhotos.slice(0, 3) });
        await delay(DELAY_MS);
      }

      const output = {
        slug,
        nom,
        fetchedAt: new Date().toISOString(),
        header: headerPhotos,
        lieux: lieuxPhotos,
      };

      writeFileSync(candidatesPath, JSON.stringify(output, null, 2), "utf-8");
      doneCount++;
      writeStatusCache(allSlugs.length, doneCount);
      console.log(`[${i + 1}/${slugs.length}] ${slug} ✓ (header: ${headerPhotos.length}, lieux: ${lieuxPhotos.length}) [${doneCount}/${allSlugs.length}]`);
      done++;
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${i + 1}/${slugs.length}] ${slug} ✗ ${msg.slice(0, 80)}`);
    }
  }

  console.log(`\n═══════════════════════════════`);
  console.log(`✓ ${done} traités, ${errors} erreurs`);
  console.log(`  Fichiers : photos/{slug}/commons-candidates.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
