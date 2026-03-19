import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getVoyageWithOwner } from "../../../../data/mock-voyages";
import { getFriendIds } from "../../../../data/mock-friends";
import { getProfileById } from "../../../../data/test-profiles";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cookieStore = await cookies();
    const profileId = cookieStore.get("van_auth")?.value ?? "";

    if (!profileId) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    const result = getVoyageWithOwner(slug, profileId, getFriendIds(profileId));
    if (!result) {
      return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
    }

    const ownerName = result.ownerProfileId
      ? getProfileById(result.ownerProfileId)?.name ?? "Ami"
      : undefined;

    return NextResponse.json({
      ...result.voyage,
      isOwner: result.isOwner,
      ownerProfileId: result.ownerProfileId,
      ownerName,
    });
  } catch (e) {
    console.error("API voyage [slug]:", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
