/**
 * Stockage local du contenu Viago par étape (phase simulation).
 * Clé : viago_{voyageId}_{stepId}
 */

export type ViagoPhotoTextPosition = "below" | "overlay-bottom" | "overlay-top";
export type ViagoTextSize = "xs" | "sm" | "base" | "lg";

export interface ViagoPhotoItem {
  url: string;
  /** Titre court (taille indépendante du corps) */
  photoTitle?: string;
  /** Texte ; utiliser **mot** pour du gras partiel */
  anecdote?: string;
  titleSize?: ViagoTextSize;
  bodySize?: ViagoTextSize;
  textPosition?: ViagoPhotoTextPosition;
}

export interface ViagoStepContent {
  anecdote?: string;
  photos: ViagoPhotoItem[];
  /** Image colonne hero étape (sinon photo lieu API) */
  heroPhotoUrl?: string | null;
  /** Date affichée (YYYY-MM-DD) */
  dateOverride?: string | null;
  /** Nom d’étape affiché */
  displayTitleOverride?: string | null;
  updatedAt?: string;
}

const PREFIX = "viago_";

function isSize(v: unknown): v is ViagoTextSize {
  return v === "xs" || v === "sm" || v === "base" || v === "lg";
}

function normalizePhoto(raw: unknown): ViagoPhotoItem | null {
  if (typeof raw === "string" && raw.trim()) {
    return { url: raw.trim() };
  }
  if (raw && typeof raw === "object" && "url" in raw) {
    const u = (raw as { url?: unknown }).url;
    if (typeof u === "string" && u.trim()) {
      const o = raw as Record<string, unknown>;
      return {
        url: u.trim(),
        photoTitle: typeof o.photoTitle === "string" ? o.photoTitle : undefined,
        anecdote: typeof o.anecdote === "string" ? o.anecdote : undefined,
        titleSize: isSize(o.titleSize) ? o.titleSize : undefined,
        bodySize: isSize(o.bodySize) ? o.bodySize : undefined,
        textPosition:
          o.textPosition === "below" ||
          o.textPosition === "overlay-bottom" ||
          o.textPosition === "overlay-top"
            ? o.textPosition
            : undefined,
      };
    }
  }
  return null;
}

function normalizePhotos(raw: unknown): ViagoPhotoItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ViagoPhotoItem[] = [];
  for (const item of raw) {
    const p = normalizePhoto(item);
    if (p) out.push(p);
  }
  return out;
}

export function getViagoStorageKey(voyageId: string, stepId: string): string {
  return `${PREFIX}${voyageId}_${stepId}`;
}

export function getViagoStepContent(
  voyageId: string,
  stepId: string
): ViagoStepContent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getViagoStorageKey(voyageId, stepId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      anecdote: typeof parsed.anecdote === "string" ? parsed.anecdote : "",
      photos: normalizePhotos(parsed.photos),
      heroPhotoUrl:
        parsed.heroPhotoUrl === null
          ? null
          : typeof parsed.heroPhotoUrl === "string"
            ? parsed.heroPhotoUrl
            : undefined,
      dateOverride:
        typeof parsed.dateOverride === "string" ? parsed.dateOverride : null,
      displayTitleOverride:
        typeof parsed.displayTitleOverride === "string"
          ? parsed.displayTitleOverride
          : null,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function saveViagoStepContent(
  voyageId: string,
  stepId: string,
  content: Partial<ViagoStepContent>
): void {
  if (typeof window === "undefined") return;
  const existing = getViagoStepContent(voyageId, stepId) ?? {
    anecdote: "",
    photos: [],
    heroPhotoUrl: undefined,
    dateOverride: null,
    displayTitleOverride: null,
  };
  const merged: ViagoStepContent = {
    anecdote: content.anecdote ?? existing.anecdote,
    photos: content.photos ?? existing.photos,
    heroPhotoUrl:
      content.heroPhotoUrl !== undefined ? content.heroPhotoUrl : existing.heroPhotoUrl,
    dateOverride:
      content.dateOverride !== undefined ? content.dateOverride : existing.dateOverride,
    displayTitleOverride:
      content.displayTitleOverride !== undefined
        ? content.displayTitleOverride
        : existing.displayTitleOverride,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    getViagoStorageKey(voyageId, stepId),
    JSON.stringify(merged)
  );
}
