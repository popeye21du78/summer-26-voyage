import { NextRequest, NextResponse } from "next/server";
import { getProfileById } from "../../../data/test-profiles";
import { getServerAuth } from "@/lib/auth-unified";
import { supabaseAdmin } from "@/lib/supabase-admin";

const COOKIE_NAME = "van_auth";

/**
 * GET /api/me — session **Supabase** (e-mail) prioritaire, sinon profil de **démo** (`van_auth`).
 */
export async function GET(request: NextRequest) {
  const auth = await getServerAuth();
  if (auth?.kind === "supabase") {
    let name = auth.email?.split("@")[0] ?? "Voyageur";
    if (supabaseAdmin) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("display_name")
        .eq("id", auth.userId)
        .maybeSingle();
      if (p?.display_name?.trim()) name = p.display_name.trim();
    }
    return NextResponse.json({
      profileId: auth.userId,
      name,
      authMode: "supabase" as const,
    });
  }
  const profileId = request.cookies.get(COOKIE_NAME)?.value ?? "";
  const profile = getProfileById(profileId);

  if (!profile) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  return NextResponse.json({
    profileId: profile.id,
    name: profile.name,
    authMode: "test" as const,
  });
}
