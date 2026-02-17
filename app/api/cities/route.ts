import { NextRequest, NextResponse } from "next/server";
import { getLieuxFromCentral, getDepartementsList } from "../../../lib/lieux-central";

/**
 * GET /api/cities
 * Lit data/cities/lieux-central.xlsx et retourne les lieux pour la carte.
 * Query: ?code_dep=13 pour filtrer par département.
 * Query: ?list_departements=1 pour retourner aussi la liste des départements.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codeDep = searchParams.get("code_dep") ?? undefined;
  const listDep = searchParams.get("list_departements");
  const lieux = getLieuxFromCentral(codeDep);
  if (listDep) {
    const departements = getDepartementsList();
    return NextResponse.json({ lieux, departements });
  }
  return NextResponse.json({ lieux });
}
