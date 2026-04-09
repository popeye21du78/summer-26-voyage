/**
 * GET /api/photo-lieu?ville=Granville&slug=granville (slug optionnel, sinon dérivé du nom)
 * Voir `resolveLieuThumb` pour la chaîne de résolution.
 */
import { NextRequest } from "next/server";
import { resolveLieuThumb } from "../../../lib/resolve-lieu-thumb";
import { slugFromNom } from "../../../lib/slug-from-nom";

export async function GET(req: NextRequest) {
  const ville = req.nextUrl.searchParams.get("ville")?.trim();
  const slugHint = req.nextUrl.searchParams.get("slug")?.trim().toLowerCase();
  if (!ville) {
    return Response.json({ error: "Paramètre ville requis" }, { status: 400 });
  }

  const slug = slugHint || slugFromNom(ville);
  const thumb = await resolveLieuThumb(ville, slug);
  if (!thumb) {
    return Response.json({ error: "Aucune photo trouvée" }, { status: 404 });
  }

  return Response.json({
    url: thumb.url,
    alt: thumb.alt,
    credit: thumb.credit,
    source: thumb.source,
    premiumPatrimoine: thumb.premiumPatrimoine,
  });
}
