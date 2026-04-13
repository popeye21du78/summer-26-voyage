/**
 * Stockage local du contenu Viago par étape (phase simulation).
 * Clé : viago_{voyageId}_{stepId}
 */

export type ViagoPhotoTextPosition = "below" | "overlay-bottom" | "overlay-top";
export type ViagoTextSize = "xs" | "sm" | "base" | "lg";

/** Positionnement libre sur l’image (éditeur visuel). */
export interface ViagoPhotoOverlayLayout {
  /** 0–100 — ancrage horizontal du centre du bloc */
  xPct: number;
  /** 0–100 — ancrage vertical du centre du bloc */
  yPct: number;
  /** ~0.65–1.45 — échelle du bloc (pincement / zoom texte) */
  scale: number;
}

export interface ViagoPhotoItem {
  url: string;
  /** Titre court (taille indépendante du corps) */
  photoTitle?: string;
  /** Texte ; utiliser **mot** pour du gras partiel */
  anecdote?: string;
  titleSize?: ViagoTextSize;
  bodySize?: ViagoTextSize;
  textPosition?: ViagoPhotoTextPosition;
  /** Si défini, le rendu utilise ce placement (éditeur type stories) ; sinon logique legacy `textPosition`. */
  overlayLayout?: ViagoPhotoOverlayLayout;
  /** Contraste forcé ; si absent, calcul automatique à l’affichage. */
  textTone?: "light" | "dark";
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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeOverlayLayout(raw: unknown): ViagoPhotoOverlayLayout | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const x = typeof o.xPct === "number" ? o.xPct : Number(o.xPct);
  const y = typeof o.yPct === "number" ? o.yPct : Number(o.yPct);
  const s = typeof o.scale === "number" ? o.scale : Number(o.scale);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(s)) return undefined;
  return {
    xPct: clamp(x, 0, 100),
    yPct: clamp(y, 0, 100),
    scale: clamp(s, 0.5, 1.65),
  };
}

function normalizePhoto(raw: unknown): ViagoPhotoItem | null {
  if (typeof raw === "string" && raw.trim()) {
    return { url: raw.trim() };
  }
  if (raw && typeof raw === "object" && "url" in raw) {
    const u = (raw as { url?: unknown }).url;
    if (typeof u === "string" && u.trim()) {
      const o = raw as Record<string, unknown>;
      const overlayLayout = normalizeOverlayLayout(o.overlayLayout);
      const textTone =
        o.textTone === "light" || o.textTone === "dark" ? o.textTone : undefined;
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
        overlayLayout,
        textTone,
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

const SIZE_RANK: Record<ViagoTextSize, number> = {
  xs: 0,
  sm: 1,
  base: 2,
  lg: 3,
};

/** Convertit l’échelle « pinch » en tailles titre / corps (compat données existantes). */
export function scaleToViagoSizes(scale: number): {
  title: ViagoTextSize;
  body: ViagoTextSize;
} {
  const s = clamp(scale, 0.5, 1.65);
  if (s < 0.82) return { title: "sm", body: "xs" };
  if (s < 0.98) return { title: "base", body: "sm" };
  if (s < 1.12) return { title: "lg", body: "base" };
  return { title: "lg", body: "lg" };
}

/** Estimation d’échelle à partir des tailles stockées (legacy). */
export function viagoSizesToScale(
  title: ViagoTextSize | undefined,
  body: ViagoTextSize | undefined
): number {
  const t = SIZE_RANK[title ?? "base"];
  const b = SIZE_RANK[body ?? "sm"];
  return clamp(0.72 + ((t + b) / 6) * 0.38, 0.65, 1.5);
}

/** Point de départ pour l’éditeur visuel selon l’ancien champ position. */
export function defaultOverlayFromPosition(
  pos: ViagoPhotoTextPosition | undefined
): ViagoPhotoOverlayLayout {
  switch (pos) {
    case "overlay-top":
      return { xPct: 50, yPct: 16, scale: 1 };
    case "overlay-bottom":
      return { xPct: 50, yPct: 84, scale: 1 };
    default:
      return { xPct: 50, yPct: 50, scale: 1 };
  }
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
