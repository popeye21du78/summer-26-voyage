type StripPhoto = { url: string; nom: string };

/** Cache session (même onglet) : retour accueil sans flash ni Unsplash de secours. */
const cache = new Map<string, StripPhoto[]>();

export function getHeroBatchCached(stepsKey: string): StripPhoto[] | undefined {
  const v = cache.get(stepsKey);
  return v && v.length > 0 ? v : undefined;
}

export function setHeroBatchCached(stepsKey: string, photos: StripPhoto[]): void {
  if (stepsKey && photos.length > 0) cache.set(stepsKey, photos);
}
