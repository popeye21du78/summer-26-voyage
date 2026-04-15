/** Paramètres d’affichage alignés sur `CityPhoto` (Unsplash). */
export function sharpenUnsplashUrl(url: string): string {
  if (!url.includes("images.unsplash.com")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}w=1200&q=85`;
}
