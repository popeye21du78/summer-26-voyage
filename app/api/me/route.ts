import { NextRequest, NextResponse } from "next/server";
import { getProfileById } from "../../../data/test-profiles";

const COOKIE_NAME = "van_auth";

/**
 * GET /api/me
 * Retourne le profil courant (phase test : un des 5 profils choisi au login).
 */
export async function GET(request: NextRequest) {
  const profileId = request.cookies.get(COOKIE_NAME)?.value ?? "";
  const profile = getProfileById(profileId);

  if (!profile) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  return NextResponse.json({
    profileId: profile.id,
    name: profile.name,
  });
}
