/**
 * Wikipedia FR : extrait texte (1–2 phrases) pour une commune.
 * Utilisé pour remplir la colonne "description" sans saisie manuelle.
 */

const WIKI_API = "https://fr.wikipedia.org/w/api.php";

export async function getWikipediaExtract(
  title: string,
  options?: { departement?: string }
): Promise<string | null> {
  const titles = [title.trim()];
  if (options?.departement?.trim()) {
    titles.push(`${title.trim()} (${options.departement.trim()})`);
  }

  for (const t of titles) {
    const url = new URL(WIKI_API);
    url.searchParams.set("action", "query");
    url.searchParams.set("prop", "extracts");
    url.searchParams.set("exintro", "1");
    url.searchParams.set("explaintext", "1");
    url.searchParams.set("exsentences", "2");
    url.searchParams.set("titles", t);
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    try {
      const res = await fetch(url.toString());
      if (!res.ok) continue;

      const data = (await res.json()) as {
        query?: { pages?: Record<string, { extract?: string }> };
      };
      const pages = data.query?.pages;
      if (!pages) continue;

      const page = Object.values(pages)[0];
      const extract = page?.extract?.trim();
      if (extract) return extract;
    } catch {
      // continue with next title
    }
  }

  return null;
}
