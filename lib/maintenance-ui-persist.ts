/**
 * Reprise de session maintenance (localStorage) : onglet actif + position dans les files.
 * Les validations restent dans les JSON serveur ; ici on évite de repartir au premier lieu après refresh.
 */

const PREFIX = "vv:maintenance:";

export type MaintenanceTabId = "links" | "photos" | "beauty" | "wiki";

export type MaintenanceQueueKey = "commons" | "beauty" | "wiki";

/** File « Top 200 », « tous les PBVF » ou tout le patrimoine dans l’onglet beauty. */
export type BeautyQueueScopeId = "top200" | "pbvf" | "all";

export function readBeautyQueueScope(): BeautyQueueScopeId {
  if (typeof window === "undefined") return "top200";
  try {
    const s = localStorage.getItem(`${PREFIX}beauty:queueScope`);
    if (s === "pbvf" || s === "top200" || s === "all") return s;
  } catch {
    /* ignore */
  }
  return "top200";
}

export function persistBeautyQueueScope(scope: BeautyQueueScopeId) {
  try {
    localStorage.setItem(`${PREFIX}beauty:queueScope`, scope);
  } catch {
    /* ignore */
  }
}

export function readMaintenanceTab(): MaintenanceTabId | null {
  if (typeof window === "undefined") return null;
  try {
    const t = localStorage.getItem(`${PREFIX}activeTab`) as MaintenanceTabId;
    if (t === "links" || t === "photos" || t === "beauty" || t === "wiki") return t;
  } catch {
    /* ignore */
  }
  return null;
}

export function persistMaintenanceTab(tab: MaintenanceTabId) {
  try {
    localStorage.setItem(`${PREFIX}activeTab`, tab);
  } catch {
    /* ignore */
  }
}

/** Index à restaurer : d’abord dernière ville avec validation, puis dernière position (liste). */
export function resolveMaintenanceQueueIndex(
  items: { slug: string }[],
  key: MaintenanceQueueKey
): number {
  if (typeof window === "undefined" || items.length === 0) return 0;
  try {
    const lastValidated = localStorage.getItem(`${PREFIX}${key}:lastValidatedSlug`);
    const resume = localStorage.getItem(`${PREFIX}${key}:resumeSlug`);
    for (const slug of [lastValidated, resume]) {
      if (!slug) continue;
      const i = items.findIndex((it) => it.slug === slug);
      if (i >= 0) return i;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

export function persistMaintenanceResumeSlug(key: MaintenanceQueueKey, slug: string) {
  try {
    localStorage.setItem(`${PREFIX}${key}:resumeSlug`, slug.trim().toLowerCase());
  } catch {
    /* ignore */
  }
}

export function persistMaintenanceLastValidatedSlug(key: MaintenanceQueueKey, slug: string) {
  const s = slug.trim().toLowerCase();
  try {
    localStorage.setItem(`${PREFIX}${key}:lastValidatedSlug`, s);
    localStorage.setItem(`${PREFIX}${key}:resumeSlug`, s);
  } catch {
    /* ignore */
  }
}

export function resolveWikiResumeSlug(cities: { slug: string }[]): string | null {
  if (typeof window === "undefined" || cities.length === 0) return null;
  try {
    const lastValidated = localStorage.getItem(`${PREFIX}wiki:lastValidatedSlug`);
    const resume = localStorage.getItem(`${PREFIX}wiki:resumeSlug`);
    for (const s of [lastValidated, resume]) {
      if (s && cities.some((c) => c.slug === s)) return s;
    }
  } catch {
    /* ignore */
  }
  return null;
}
