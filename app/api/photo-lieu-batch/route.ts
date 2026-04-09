import { resolveLieuThumb } from "@/lib/resolve-lieu-thumb";
import { slugForLieuPhoto } from "@/lib/slug-for-lieu-photo";

const MAX_ITEMS = 24;

type BodyItem = { nom?: string; id?: string };

/**
 * POST /api/photo-lieu-batch
 * Body: { items: { nom: string; id?: string }[] }
 * Réponses alignées sur l’ordre des items (vignettes accueil, amis, etc.).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { items?: BodyItem[] };
    const raw = body.items;
    if (!Array.isArray(raw) || raw.length === 0) {
      return Response.json({ error: "items[] requis" }, { status: 400 });
    }
    const items = raw.slice(0, MAX_ITEMS);
    const results: {
      nom: string;
      slug: string;
      url: string | null;
      source?: string;
    }[] = [];

    for (const item of items) {
      const nom = String(item.nom ?? "").trim();
      if (!nom) {
        results.push({ nom: "", slug: "", url: null });
        continue;
      }
      const slug = slugForLieuPhoto(String(item.id ?? ""), nom);
      const thumb = await resolveLieuThumb(nom, slug);
      results.push({
        nom,
        slug,
        url: thumb?.url ?? null,
        source: thumb?.source,
      });
    }

    return Response.json({ results });
  } catch (e) {
    console.error("photo-lieu-batch:", e);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
