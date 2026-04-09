import { NextResponse } from "next/server";
import { loadBigCitiesForWikiTest } from "@/lib/maintenance-photo-queue";

/** Liste des plus grosses villes (patrimoine) pour l’onglet test Commons / Wikipedia. */
export async function GET() {
  try {
    const items = loadBigCitiesForWikiTest(120);
    return NextResponse.json({
      total: items.length,
      items: items.map((r) => ({
        slug: r.slug,
        nom: r.nom,
        departement: r.departement,
        code_dep: r.code_dep,
        categorie_taille: r.categorie_taille,
      })),
    });
  } catch (e) {
    console.error("maintenance wiki-cities:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
