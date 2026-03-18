/**
 * Fetch Wikimedia Commons photos pour un lieu (à la demande).
 * Utilisé par l'API photo-selection-lieu quand le cache n'existe pas.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { getDescriptionForSlug, getPhotoSlotsFromDescription } from "./description-lieu";
import {
  fetchTopCommonsPhotos,
  fetchTopCommonsPhotosByGeo,
  delay,
  type CommonsPhoto,
} from "./commons-api";

const PHOTOS_ROOT = join(process.cwd(), "photos");
const LIEUX_JSON = join(process.cwd(), "data", "cities", "lieux-central.json");
const DELAY_MS = 200;

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

/** Pas d'exclusion dans la requête (casse la recherche). Filtrage dans commons-api (REJECT_TITLE). */

function buildHeaderQuery(nom: string, departement: string): string[] {
  const queries: string[] = [nom];
  if (departement) queries.push(`${nom} ${departement}`);
  queries.push(`${nom} France`);
  return queries;
}

/** Extrait un mot-clé simple du label : nom ville + mot-clé. */
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
        await delay(RETRY_DELAY_MS);
      } else {
        throw e;
      }
    }
  }
  throw lastErr;
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

  if (typeof lieu?.lat === "number" && typeof lieu?.lng === "number") {
    await delay(DELAY_MS);
    const byGeo = await withRetry(() => fetchTopCommonsPhotosByGeo(lieu.lat!, lieu.lng!, 2000, 20));
    for (const p of byGeo.filter((p) => titleMatchesNom(p.title, nomKeywords))) {
      if (!seen.has(p.url)) {
        seen.add(p.url);
        candidates.push(p);
      }
    }
  }

  if (candidates.length < targetCount) {
    const headerQueries = buildHeaderQuery(nom, departement).slice(0, 2);
    for (const q of headerQueries) {
      if (candidates.length >= targetCount) break;
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

/** Version de la stratégie de recherche. Incrémenter pour forcer un rechargement de toutes les villes. */
export const COMMONS_STRATEGY_VERSION = 2;

export interface LieuCommonsData {
  slug: string;
  nom: string;
  fetchedAt: string;
  strategyVersion?: number;
  header: CommonsPhoto[];
  lieux: { label: string; photos: CommonsPhoto[] }[];
}

let fetchQueue: Promise<unknown> = Promise.resolve();

/** File d'attente : une seule requête Wikimedia à la fois pour éviter le rate limiting. */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const prev = fetchQueue;
  let resolve: (v: T) => void;
  let reject: (e: unknown) => void;
  const p = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  fetchQueue = prev.then(
    () => fn().then(resolve, reject),
    () => fn().then(resolve, reject)
  );
  return p;
}

/** Récupère les photos Commons pour un lieu. Lit le cache si présent, sinon fetch et sauvegarde. */
export async function fetchCommonsForLieu(slug: string, options?: { force?: boolean }): Promise<LieuCommonsData | null> {
  const candidatesPath = join(PHOTOS_ROOT, slug, "commons-candidates.json");

  if (!options?.force && existsSync(candidatesPath)) {
    try {
      const raw = readFileSync(candidatesPath, "utf-8");
      const cached = JSON.parse(raw) as LieuCommonsData;
      if (cached.strategyVersion === COMMONS_STRATEGY_VERSION) return cached;
    } catch {
      /* fallback to fetch */
    }
  }

  const description = getDescriptionForSlug(slug);
  if (!description) return null;

  return enqueue(async () => {
    const lieu = getLieuBySlug(slug);
    const nom = lieu?.nom ?? slug.replace(/-/g, " ");
    const departement = lieu?.departement ?? "";
    const photoLieux = getPhotoSlotsFromDescription(description);

    const headerPhotos = await fetchHeaderPhotos(lieu, nom, departement, 3);

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
    }

    const output: LieuCommonsData = {
      slug,
      nom,
      fetchedAt: new Date().toISOString(),
      strategyVersion: COMMONS_STRATEGY_VERSION,
      header: headerPhotos,
      lieux: lieuxPhotos,
    };

    const dir = dirname(candidatesPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(candidatesPath, JSON.stringify(output, null, 2), "utf-8");

    return output;
  });
}
