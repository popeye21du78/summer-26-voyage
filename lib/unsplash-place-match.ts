/**
 * Filtre « lieu réel » sur les résultats Unsplash : on n’affiche une image
 * que si alt / description / tags contiennent le nom du lieu (sinon vide).
 */

const GENERIC_SLUG_PARTS = new Set([
  "vieux",
  "port",
  "sur",
  "sous",
  "grande",
  "petit",
  "bas",
  "haut",
  "neuf",
  "saint",
  "sainte",
  "st",
  "ste",
  "la",
  "le",
  "les",
  "du",
  "des",
  "de",
  "en",
  "aux",
  "d",
]);

export function normalizeForPlaceMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`´]/g, " ")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Texte issu des métadonnées Unsplash exploitables pour le filtre. */
export function haystackFromUnsplashPhoto(photo: {
  alt_description?: string | null;
  description?: string | null;
  tags?: { title?: string }[];
  tags_preview?: { title?: string }[];
}): string {
  const chunks: string[] = [];
  if (photo.alt_description) chunks.push(photo.alt_description);
  if (photo.description) chunks.push(String(photo.description));
  for (const t of photo.tags ?? []) {
    if (t.title) chunks.push(t.title);
  }
  for (const t of photo.tags_preview ?? []) {
    if (t.title) chunks.push(t.title);
  }
  return normalizeForPlaceMatch(chunks.join(" "));
}

/**
 * Variantes du nom (affiché + slug) à retrouver dans les métadonnées.
 * Au moins une doit matcher (mot entier pour les tokens courts, phrase pour les libellés multi-mots).
 */
export function buildPlaceAnchors(cityName: string, stepId?: string): string[] {
  const set = new Set<string>();
  const push = (raw: string) => {
    const t = normalizeForPlaceMatch(raw);
    if (t.length < 2) return;
    set.add(t);
  };

  push(cityName);
  if (stepId) {
    push(stepId);
    for (const part of stepId.split("-")) {
      if (part.length >= 4 && !GENERIC_SLUG_PARTS.has(part)) push(part);
    }
  }

  return [...set];
}

/** Au moins une ancre apparaît dans le texte des métadonnées (sinon photo ignorée). */
export function unsplashPhotoMatchesAnchors(
  photo: {
    alt_description?: string | null;
    description?: string | null;
    tags?: { title?: string }[];
    tags_preview?: { title?: string }[];
  },
  anchors: string[]
): boolean {
  const hay = haystackFromUnsplashPhoto(photo);
  if (!hay.length) return false;

  for (const anchor of anchors) {
    if (anchor.length < 3) continue;
    if (anchor.includes(" ")) {
      if (hay.includes(anchor)) return true;
      continue;
    }
    const re = new RegExp(`\\b${escapeRegex(anchor)}\\b`, "i");
    if (re.test(hay)) return true;
  }
  return false;
}

/**
 * La requête API contient déjà le nom du lieu (mot ou phrase) : on fait confiance au classement
 * Unsplash même si alt/tags sont vides (cas fréquent pour « Béziers », etc.).
 */
export function searchQueryImpliesPlace(searchQuery: string, anchors: string[]): boolean {
  const q = normalizeForPlaceMatch(searchQuery);
  if (!q.length) return false;
  for (const anchor of anchors) {
    if (anchor.length < 3) continue;
    if (anchor.includes(" ")) {
      if (q.includes(anchor)) return true;
      continue;
    }
    const re = new RegExp(`\\b${escapeRegex(anchor)}\\b`, "i");
    if (re.test(q)) return true;
  }
  return false;
}

/** Métadonnées OK, ou requête déjà ciblée sur le lieu. */
export function unsplashPhotoRelevantToPlace(
  photo: Parameters<typeof unsplashPhotoMatchesAnchors>[0],
  anchors: string[],
  searchQuery: string
): boolean {
  if (unsplashPhotoMatchesAnchors(photo, anchors)) return true;
  if (searchQueryImpliesPlace(searchQuery, anchors)) return true;
  return false;
}
