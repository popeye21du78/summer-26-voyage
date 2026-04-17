/** Comparaison d’URLs photo (Unsplash : même origin + pathname). */
export function urlsMatchPhoto(a: string, b: string): boolean {
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
