import { NextRequest, NextResponse } from "next/server";
import { VALID_PROFILE_IDS } from "../../../../data/test-profiles";

const COOKIE_NAME = "van_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

export async function POST(request: NextRequest) {
  let profileId: string;
  try {
    const body = await request.json();
    profileId = typeof body?.profileId === "string" ? body.profileId.trim().toLowerCase() : "";
  } catch {
    profileId = "";
  }

  if (!profileId || !VALID_PROFILE_IDS.includes(profileId)) {
    return NextResponse.json(
      { ok: false, error: "Profil invalide" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, profileId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
