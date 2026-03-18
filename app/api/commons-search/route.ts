import { NextRequest, NextResponse } from "next/server";
import { fetchTopCommonsPhotos } from "../../../lib/commons-api";

/** GET /api/commons-search?q=Belves — 3 photos Wikimedia pour la requête. */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q") || "Belves";
    const photos = await fetchTopCommonsPhotos(q, 3);
    return NextResponse.json({ photos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
