import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { CommonsPhoto } from "./commons-api";
import { supabaseAdmin } from "./supabase-admin";
import type { Json } from "../types/supabase";

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
  photos?: ValidatedPhotoMeta[];
  photo?: ValidatedPhotoMeta;
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

function dedupePhotosMeta(list: ValidatedPhotoMeta[]): ValidatedPhotoMeta[] {
  const out: ValidatedPhotoMeta[] = [];
  const seen = new Set<string>();
  for (const p of list) {
    const k = p.url.trim();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

/** Fusionne fichier local (git) + Supabase pour une même clé. */
function mergePhotoValidationEntries(
  remote: PhotoValidationEntry | undefined,
  file: PhotoValidationEntry | undefined
): PhotoValidationEntry | undefined {
  if (!remote && !file) return undefined;
  if (!remote) return file;
  if (!file) return remote;

  const ra = listValidatedPhotos(remote);
  const fa = listValidatedPhotos(file);
  const mergedPhotos = dedupePhotosMeta([...ra, ...fa]);

  if (mergedPhotos.length > 0) {
    return {
      status: "validated",
      at: new Date().toISOString(),
      searchQuery: remote.searchQuery ?? file.searchQuery ?? "",
      photos: mergedPhotos,
      rejectedOffsets: [
        ...new Set([...(remote.rejectedOffsets ?? []), ...(file.rejectedOffsets ?? [])]),
      ],
    };
  }

  if (remote.status === "validated" || file.status === "validated") {
    return remote.status === "validated" ? remote : file;
  }
  return remote.at >= file.at ? remote : file;
}

async function fetchEntryRemote(slug: string): Promise<PhotoValidationEntry | undefined> {
  if (!supabaseAdmin) return undefined;
  const key = slug.trim().toLowerCase();
  const { data, error } = await supabaseAdmin
    .from("photo_validations")
    .select("entry")
    .eq("slug", key)
    .maybeSingle();
  if (error || !data?.entry) return undefined;
  return data.entry as PhotoValidationEntry;
}

async function upsertEntryRemote(slug: string, entry: PhotoValidationEntry): Promise<void> {
  if (!supabaseAdmin) return;
  const key = slug.trim().toLowerCase();
  const { error } = await supabaseAdmin.from("photo_validations").upsert(
    {
      slug: key,
      entry: entry as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );
  if (error) throw error;
}

async function deleteEntryRemote(slug: string): Promise<void> {
  if (!supabaseAdmin) return;
  const key = slug.trim().toLowerCase();
  await supabaseAdmin.from("photo_validations").delete().eq("slug", key);
}

/** Entrée fusionnée fichier + Supabase (lecture seule). */
export async function getValidationForSlug(slug: string): Promise<PhotoValidationEntry | undefined> {
  const key = slug.trim().toLowerCase();
  const fromFile = ensureRead()[key];
  const fromRemote = await fetchEntryRemote(key);
  return mergePhotoValidationEntries(fromRemote, fromFile);
}

export async function getPhotoValidations(): Promise<PhotoValidationsFile> {
  const file = ensureRead();
  if (!supabaseAdmin) return file;

  const { data, error } = await supabaseAdmin.from("photo_validations").select("slug, entry");
  if (error || !data?.length) return file;

  const out: PhotoValidationsFile = { ...file };
  for (const row of data) {
    const slug = row.slug;
    const remote = row.entry as PhotoValidationEntry;
    out[slug] = mergePhotoValidationEntries(remote, file[slug]) ?? remote;
  }
  return out;
}

/** Même image Unsplash / CDN souvent avec des query params différents (mobile, sharpen, etc.). */
function urlsMatchStored(a: string, b: string): boolean {
  const x = a.trim();
  const y = b.trim();
  if (x === y) return true;
  try {
    const ua = new URL(x);
    const ub = new URL(y);
    if (ua.origin !== ub.origin || ua.pathname !== ub.pathname) return false;
    if (/images\.unsplash\.com$/i.test(ua.hostname)) return true;
    return x === y;
  } catch {
    return false;
  }
}

export async function isUrlValidatedForSlug(slug: string, url: string): Promise<boolean> {
  const key = slug.trim().toLowerCase();
  const entry = await getValidationForSlug(key);
  const list = listValidatedPhotos(entry);
  return list.some((p) => urlsMatchStored(p.url, url));
}

function persistLocalOnly(all: PhotoValidationsFile) {
  writeAll(all);
}

export async function appendValidatedPhoto(slug: string, photo: CommonsPhoto, searchQuery: string) {
  const key = slug.trim().toLowerCase();
  const prev = await getValidationForSlug(key);
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
  const newEntry: PhotoValidationEntry = {
    status: "validated",
    at: new Date().toISOString(),
    searchQuery,
    photos: next,
    rejectedOffsets: prev?.rejectedOffsets,
  };

  if (supabaseAdmin) {
    await upsertEntryRemote(key, newEntry);
  } else {
    const all = ensureRead();
    all[key] = newEntry;
    persistLocalOnly(all);
  }
}

export async function removeValidatedPhoto(slug: string, photoUrl: string): Promise<boolean> {
  const key = slug.trim().toLowerCase();
  const prev = await getValidationForSlug(key);
  if (prev?.status !== "validated") return false;
  const before = listValidatedPhotos(prev);
  const list = before.filter((p) => p.url !== photoUrl);
  if (list.length === before.length) return false;

  if (list.length === 0) {
    if (supabaseAdmin) {
      await deleteEntryRemote(key);
    }
    const all = ensureRead();
    if (all[key]) {
      delete all[key];
      persistLocalOnly(all);
    }
    return true;
  }

  const newEntry: PhotoValidationEntry = {
    status: "validated",
    at: new Date().toISOString(),
    searchQuery: prev.searchQuery,
    photos: list,
    rejectedOffsets: prev.rejectedOffsets,
  };

  if (supabaseAdmin) {
    await upsertEntryRemote(key, newEntry);
  } else {
    const all = ensureRead();
    all[key] = newEntry;
    persistLocalOnly(all);
  }
  return true;
}

export async function recordRejectedBatch(slug: string, offset: number, searchQuery: string) {
  const key = slug.trim().toLowerCase();
  const prev = await getValidationForSlug(key);
  if (prev?.status === "validated") return;
  const rejected = [...(prev?.rejectedOffsets ?? [])];
  if (!rejected.includes(offset)) rejected.push(offset);
  const newEntry: PhotoValidationEntry = {
    status: "none_suitable_yet",
    at: new Date().toISOString(),
    searchQuery,
    rejectedOffsets: rejected,
  };

  if (supabaseAdmin) {
    await upsertEntryRemote(key, newEntry);
  } else {
    const all = ensureRead();
    all[key] = newEntry;
    persistLocalOnly(all);
  }
}

export async function markSkipped(slug: string) {
  const key = slug.trim().toLowerCase();
  const newEntry: PhotoValidationEntry = {
    status: "skipped",
    at: new Date().toISOString(),
  };

  if (supabaseAdmin) {
    await upsertEntryRemote(key, newEntry);
  } else {
    const all = ensureRead();
    all[key] = newEntry;
    persistLocalOnly(all);
  }
}
