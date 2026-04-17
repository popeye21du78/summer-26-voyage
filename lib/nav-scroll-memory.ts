/** Clés sessionStorage pour positions de scroll (navigation + sous-onglets). */

export const APP_SCROLL_KEY = (pathname: string) => `viago-app-scroll:${pathname}`;

export const INSPIRER_TAB_KEY = (tab: string) => `viago-tab:/inspirer:${tab}`;

export const MON_ESPACE_SECTION_KEY = (section: string) =>
  `viago-tab:/mon-espace:${section}`;

export function readScrollY(key: string): number | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(key);
  if (raw == null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function writeScrollY(key: string, y: number) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(key, String(Math.max(0, Math.round(y))));
}
