/**
 * Stockage local du contenu Viago par étape (phase simulation).
 * Clé : viago_{voyageId}_{stepId}
 */

export interface ViagoStepContent {
  anecdote?: string;
  photos: string[];
  updatedAt?: string;
}

const PREFIX = "viago_";

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
      anecdote: parsed.anecdote ?? "",
      photos: Array.isArray(parsed.photos) ? parsed.photos : [],
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
