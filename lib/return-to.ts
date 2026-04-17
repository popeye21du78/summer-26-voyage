/** Paramètre d’URL pour revenir exactement à l’écran précédent (path + query). */

export const RETURN_TO_PARAM = "returnTo";

export function isSafeReturnPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  return true;
}

export function withReturnTo(href: string, returnPath: string): string {
  if (!returnPath || !isSafeReturnPath(returnPath)) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}${RETURN_TO_PARAM}=${encodeURIComponent(returnPath)}`;
}

export function readReturnTo(searchParams: URLSearchParams | null): string | null {
  const raw = searchParams?.get(RETURN_TO_PARAM);
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    return isSafeReturnPath(decoded) ? decoded : null;
  } catch {
    return null;
  }
}
