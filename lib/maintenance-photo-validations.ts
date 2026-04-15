import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { CommonsPhoto } from "./commons-api";

const DIR = join(process.cwd(), "data", "maintenance");
const FILE = join(DIR, "photo-validations.json");

export type ValidatedPhotoMeta = Pick<
  CommonsPhoto,
  "url" | "title" | "author" | "sourceUrl" | "license" | "licenseUrl" | "width" | "height"
>;

export type PhotoValidationEntry = {
  status: "validated" | "none_suitable_yet" | "skipped";
  at: string;
  searchQuery?: string;
  /** Plusieurs photos possibles par lieu (ajout successifs). */
  photos?: ValidatedPhotoMeta[];
  /** Ancien format (une seule photo) — lu pour compatibilité. */
  photo?: ValidatedPhotoMeta;
  /** Offsets où l’utilisateur a signalé « aucune ne convient » */
  rejectedOffsets?: number[];
};

export type PhotoValidationsFile = Record<string, PhotoValidationEntry>;

function ensureRead(): PhotoValidationsFile {
  if (!existsSync(FILE)) return {};
  try {
    const raw = readFileSync(FILE, "utf-8");
    const p = JSON.parse(raw) as PhotoValidationsFile;
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

function writeAll(data: PhotoValidationsFile) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function getPhotoValidations(): PhotoValidationsFile {
  return ensureRead();
}

export function getValidationForSlug(slug: string): PhotoValidationEntry | undefined {
  return ensureRead()[slug];
}

function pickMeta(photo: CommonsPhoto): ValidatedPhotoMeta {
  return {
    url: photo.url,
    title: photo.title,
    author: photo.author,
    sourceUrl: photo.sourceUrl,
    license: photo.license,
    licenseUrl: photo.licenseUrl,
    width: photo.width,
    height: photo.height,
  };
}

/** Liste des photos validées (fusion ancien champ `photo` + `photos`). */
export function listValidatedPhotos(entry: PhotoValidationEntry | undefined): ValidatedPhotoMeta[] {
  if (!entry || entry.status !== "validated") return [];
  if (entry.photos?.length) return entry.photos;
  if (entry.photo) return [entry.photo];
  return [];
}

export function isUrlValidatedForSlug(slug: string, url: string): boolean {
  const key = slug.trim().toLowerCase();
  const entry = getValidationForSlug(key);
  const list = listValidatedPhotos(entry);
  return list.some((p) => p.url === url);
}

/** Ajoute une photo validée sans retirer les précédentes (déduplication par URL). */
export function appendValidatedPhoto(slug: string, photo: CommonsPhoto, searchQuery: string) {
  const all = ensureRead();
  const prev = all[slug];
  const existing =
    prev?.status === "validated"
      ? listValidatedPhotos(prev)
      : prev?.status === "none_suitable_yet"
        ? []
        : [];
  const urls = new Set(existing.map((p) => p.url));
  const meta = pickMeta(photo);
  if (urls.has(meta.url)) return;
  const next = [...existing, meta];
  all[slug] = {
    status: "validated",
    at: new Date().toISOString(),
    searchQuery,
    photos: next,
    rejectedOffsets: prev?.rejectedOffsets,
  };
  writeAll(all);
}

/** Retire une photo du lot validé pour ce slug. Si plus aucune photo, l’entrée est supprimée. */
export function removeValidatedPhoto(slug: string, photoUrl: string): boolean {
  const all = ensureRead();
  const prev = all[slug];
  if (prev?.status !== "validated") return false;
  const before = listValidatedPhotos(prev);
  const list = before.filter((p) => p.url !== photoUrl);
  if (list.length === before.length) return false;
  if (list.length === 0) {
    delete all[slug];
  } else {
    all[slug] = {
      status: "validated",
      at: new Date().toISOString(),
      searchQuery: prev.searchQuery,
      photos: list,
      rejectedOffsets: prev.rejectedOffsets,
    };
  }
  writeAll(all);
  return true;
}

export function recordRejectedBatch(slug: string, offset: number, searchQuery: string) {
  const all = ensureRead();
  const prev = all[slug];
  if (prev?.status === "validated") return;
  const rejected = [...(prev?.rejectedOffsets ?? [])];
  if (!rejected.includes(offset)) rejected.push(offset);
  all[slug] = {
    status: "none_suitable_yet",
    at: new Date().toISOString(),
    searchQuery,
    rejectedOffsets: rejected,
  };
  writeAll(all);
}

export function markSkipped(slug: string) {
  const all = ensureRead();
  all[slug] = {
    status: "skipped",
    at: new Date().toISOString(),
  };
  writeAll(all);
}
