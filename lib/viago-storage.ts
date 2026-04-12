/**
 * Stockage local du contenu Viago par étape (phase simulation).
 * Clé : viago_{voyageId}_{stepId}
 */

export type ViagoPhotoFont = "courier" | "motto" | "sans";
export type ViagoPhotoTextPosition = "below" | "overlay-bottom" | "overlay-top";

export interface ViagoPhotoItem {
  url: string;
  /** Anecdote affichée avec la photo */
  anecdote?: string;
  font?: ViagoPhotoFont;
  bold?: boolean;
  textPosition?: ViagoPhotoTextPosition;
}

export interface ViagoStepContent {
  anecdote?: string;
  /** Photos utilisateur (URL ou data URL) + métadonnées */
  photos: ViagoPhotoItem[];
  updatedAt?: string;
}

const PREFIX = "viago_";

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
        anecdote: typeof o.anecdote === "string" ? o.anecdote : undefined,
        font:
          o.font === "courier" || o.font === "motto" || o.font === "sans"
            ? o.font
            : undefined,
        bold: typeof o.bold === "boolean" ? o.bold : undefined,
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
  };
  const merged: ViagoStepContent = {
    anecdote: content.anecdote ?? existing.anecdote,
    photos: content.photos ?? existing.photos,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    getViagoStorageKey(voyageId, stepId),
    JSON.stringify(merged)
  );
}
