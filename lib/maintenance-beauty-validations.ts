import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { CommonsPhoto } from "./commons-api";

const DIR = join(process.cwd(), "data", "maintenance");
const FILE = join(DIR, "beauty-200-validations.json");

export type BeautyPhotoMeta = {
  url: string;
  title: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  width: number;
  height: number;
};

export type Beauty200Entry = {
  at: string;
  /** Remplace la note esthétique de la fiche pour le tri du top 200 (0–10). */
  scoreEsthetiqueOverride?: number;
  unsplashPhotos?: BeautyPhotoMeta[];
  commonsPhotos?: BeautyPhotoMeta[];
  unsplashSearchQuery?: string;
  commonsSearchQuery?: string;
  unsplashRejectedOffsets?: number[];
  commonsRejectedOffsets?: number[];
  /** Bascule explicite vers l’étape Wikimedia sans validation Unsplash (ou pour continuer sur Commons). */
  unsplashPassedToCommons?: boolean;
  skipped?: boolean;
};

export type Beauty200File = Record<string, Beauty200Entry>;

function ensureRead(): Beauty200File {
  if (!existsSync(FILE)) return {};
  try {
    const raw = readFileSync(FILE, "utf-8");
    const p = JSON.parse(raw) as Beauty200File;
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

function writeAll(data: Beauty200File) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function getBeauty200Validations(): Beauty200File {
  return ensureRead();
}

export function getBeauty200Entry(slug: string): Beauty200Entry | undefined {
  return ensureRead()[slug.trim().toLowerCase()];
}

export function getScoreEsthetiqueOverridesMap(): Record<string, number> {
  const all = ensureRead();
  const out: Record<string, number> = {};
  for (const [slug, entry] of Object.entries(all)) {
    if (typeof entry?.scoreEsthetiqueOverride === "number") out[slug] = entry.scoreEsthetiqueOverride;
  }
  return out;
}

/** Compte les photos retenues pour l’affichage site (Unsplash si ≥1, sinon Commons), par lieu. */
export function getBeautyCurationStats(): {
  photosSurSite: number;
  lieuxAvecSelection: number;
  totalUnsplashValidated: number;
  totalCommonsValidated: number;
} {
  const all = ensureRead();
  let photosSurSite = 0;
  let lieuxAvecSelection = 0;
  let totalUnsplashValidated = 0;
  let totalCommonsValidated = 0;
  for (const e of Object.values(all)) {
    if (!e || e.skipped) continue;
    const u = e.unsplashPhotos?.length ?? 0;
    const c = e.commonsPhotos?.length ?? 0;
    totalUnsplashValidated += u;
    totalCommonsValidated += c;
    const n = u > 0 ? u : c;
    if (n > 0) {
      lieuxAvecSelection += 1;
      photosSurSite += n;
    }
  }
  return {
    photosSurSite,
    lieuxAvecSelection,
    totalUnsplashValidated,
    totalCommonsValidated,
  };
}

export function setBeautyScoreEsthetiqueOverride(slug: string, score: number) {
  const s = slug.trim().toLowerCase();
  const clamped = Math.max(0, Math.min(10, Math.round(Number(score))));
  const all = ensureRead();
  const prev = all[s];
  all[s] = {
    ...(prev ?? {}),
    at: new Date().toISOString(),
    scoreEsthetiqueOverride: clamped,
  };
  writeAll(all);
}

export function clearBeautyScoreEsthetiqueOverride(slug: string): boolean {
  const s = slug.trim().toLowerCase();
  const all = ensureRead();
  const prev = all[s];
  if (!prev || typeof prev.scoreEsthetiqueOverride !== "number") return false;
  const { scoreEsthetiqueOverride: _removed, ...rest } = prev;
  const keep =
    listUnsplash(rest).length > 0 ||
    listCommons(rest).length > 0 ||
    rest.skipped === true ||
    rest.unsplashPassedToCommons === true ||
    (rest.unsplashRejectedOffsets?.length ?? 0) > 0 ||
    (rest.commonsRejectedOffsets?.length ?? 0) > 0;
  if (!keep) {
    delete all[s];
  } else {
    all[s] = { ...rest, at: new Date().toISOString() };
  }
  writeAll(all);
  return true;
}

function listUnsplash(entry: Beauty200Entry | undefined): BeautyPhotoMeta[] {
  return entry?.unsplashPhotos ?? [];
}

function listCommons(entry: Beauty200Entry | undefined): BeautyPhotoMeta[] {
  return entry?.commonsPhotos ?? [];
}

export function appendBeautyUnsplash(slug: string, photo: BeautyPhotoMeta, searchQuery: string) {
  const s = slug.trim().toLowerCase();
  const all = ensureRead();
  const prev = all[s];
  if (prev?.skipped) return;
  const existing = listUnsplash(prev);
  const urls = new Set(existing.map((p) => p.url));
  if (urls.has(photo.url)) return;
  all[s] = {
    ...prev,
    at: new Date().toISOString(),
    skipped: false,
    unsplashPhotos: [...existing, photo],
    unsplashSearchQuery: searchQuery,
    commonsPhotos: prev?.commonsPhotos,
    commonsSearchQuery: prev?.commonsSearchQuery,
    unsplashRejectedOffsets: prev?.unsplashRejectedOffsets,
    commonsRejectedOffsets: prev?.commonsRejectedOffsets,
    unsplashPassedToCommons: prev?.unsplashPassedToCommons,
  };
  writeAll(all);
}

export function removeBeautyUnsplash(slug: string, photoUrl: string): boolean {
  const s = slug.trim().toLowerCase();
  const all = ensureRead();
  const prev = all[s];
  const before = listUnsplash(prev);
  const next = before.filter((p) => p.url !== photoUrl);
  if (next.length === before.length) return false;
  if (!prev) return false;
  const hasCommons = listCommons(prev).length > 0;
  const keepShell =
    hasCommons ||
    prev.unsplashPassedToCommons ||
    (prev.commonsRejectedOffsets?.length ?? 0) > 0 ||
    (prev.unsplashRejectedOffsets?.length ?? 0) > 0 ||
    typeof prev.scoreEsthetiqueOverride === "number";
  if (next.length === 0 && !keepShell) {
    delete all[s];
  } else {
    all[s] = {
      ...prev,
      unsplashPhotos: next.length ? next : undefined,
      at: new Date().toISOString(),
    };
  }
  writeAll(all);
  return true;
}

export function recordBeautyUnsplashReject(slug: string, offset: number, searchQuery: string) {
  const s = slug.trim().toLowerCase();
  const all = ensureRead();
  const prev = all[s];
  if (prev?.skipped) return;
  const rej = [...(prev?.unsplashRejectedOffsets ?? [])];
  if (!rej.includes(offset)) rej.push(offset);
  all[s] = {
    ...prev,
    at: new Date().toISOString(),
    unsplashRejectedOffsets: rej,
    unsplashSearchQuery: searchQuery,
    skipped: false,
  };
  writeAll(all);
}

export function passBeautyToCommons(slug: string) {
  const s = slug.trim().toLowerCase();
  const all = ensureRead();
  const prev = all[s];
  all[s] = {
    ...prev,
    at: new Date().toISOString(),
    unsplashPassedToCommons: true,
    skipped: false,
  };
  writeAll(all);
}

export function appendBeautyCommons(slug: string, photo: BeautyPhotoMeta, searchQuery: string) {
  const s = slug.trim().toLowerCase();
  const all = ensureRead();
  const prev = all[s];
  if (prev?.skipped) return;
  const existing = listCommons(prev);
  const urls = new Set(existing.map((p) => p.url));
  if (urls.has(photo.url)) return;
  all[s] = {
    ...prev,
    at: new Date().toISOString(),
    commonsPhotos: [...existing, photo],
    commonsSearchQuery: searchQuery,
    skipped: false,
  };
  writeAll(all);
}

export function removeBeautyCommons(slug: string, photoUrl: string): boolean {
  const s = slug.trim().toLowerCase();
  const all = ensureRead();
  const prev = all[s];
  const before = listCommons(prev);
  const next = before.filter((p) => p.url !== photoUrl);
  if (next.length === before.length) return false;
  if (!prev) return false;
  all[s] = { ...prev, commonsPhotos: next.length ? next : undefined, at: new Date().toISOString() };
  if (
    !listUnsplash(all[s]).length &&
    !next.length &&
    !all[s].unsplashPassedToCommons &&
    !all[s].skipped &&
    typeof all[s].scoreEsthetiqueOverride !== "number"
  ) {
    delete all[s];
  }
  writeAll(all);
  return true;
}

export function recordBeautyCommonsReject(slug: string, offset: number, searchQuery: string) {
  const s = slug.trim().toLowerCase();
  const all = ensureRead();
  const prev = all[s];
  if (prev?.skipped) return;
  const rej = [...(prev?.commonsRejectedOffsets ?? [])];
  if (!rej.includes(offset)) rej.push(offset);
  all[s] = {
    ...prev,
    at: new Date().toISOString(),
    commonsRejectedOffsets: rej,
    commonsSearchQuery: searchQuery,
  };
  writeAll(all);
}

export function markBeautySkipped(slug: string) {
  const s = slug.trim().toLowerCase();
  const all = ensureRead();
  const prev = all[s];
  all[s] = {
    at: new Date().toISOString(),
    skipped: true,
    ...(typeof prev?.scoreEsthetiqueOverride === "number"
      ? { scoreEsthetiqueOverride: prev.scoreEsthetiqueOverride }
      : {}),
  };
  writeAll(all);
}

export function beautyMetaToCommons(p: BeautyPhotoMeta, score: number): CommonsPhoto {
  return {
    url: p.url,
    sourceUrl: p.sourceUrl,
    title: p.title,
    width: p.width,
    height: p.height,
    size: 0,
    timestamp: new Date().toISOString(),
    author: p.author,
    license: p.license,
    licenseUrl: p.licenseUrl,
    score,
  };
}

/** Affichage site : priorité Unsplash validé, sinon Commons validé (top 200). */
export function getBeautyCuratedPhotosForSlug(slug: string, max = 3): CommonsPhoto[] | null {
  const e = getBeauty200Entry(slug.trim().toLowerCase());
  if (!e || e.skipped) return null;
  const pick =
    (e.unsplashPhotos?.length ? e.unsplashPhotos : e.commonsPhotos) ?? [];
  if (pick.length === 0) return null;
  return pick.slice(0, max).map((p, i) => beautyMetaToCommons(p, 100 - i));
}
