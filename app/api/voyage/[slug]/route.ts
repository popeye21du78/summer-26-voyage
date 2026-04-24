import { NextResponse } from "next/server";
import { getVoyageWithOwner } from "../../../../data/mock-voyages";
import { getFriendIds } from "../../../../data/mock-friends";
import { getProfileById } from "../../../../data/test-profiles";
import { getServerAuth } from "@/lib/auth-unified";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getFriendIdList(
  me: string
): Promise<string[] | undefined> {
  if (/^[0-9a-f-]{36}$/i.test(me) && supabaseAdmin) {
    const { data: edges } = await supabaseAdmin
      .from("friend_edges")
      .select("user_low, user_high, status")
      .or(`user_low.eq.${me},user_high.eq.${me}`);
    return (edges ?? [])
      .filter((e) => e.status === "accepted")
      .map((e) => (e.user_low === me ? e.user_high : e.user_low));
  }
  return getFriendIds(me);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const auth = await getServerAuth();
    if (!auth) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }
    const profileId = auth.userId;

    const result = getVoyageWithOwner(slug, profileId, await getFriendIdList(profileId));
    if (!result) {
      return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
    }

    let ownerName: string | undefined;
    if (result.ownerProfileId) {
      const o = result.ownerProfileId;
      if (supabaseAdmin && /^[0-9a-f-]{36}$/i.test(o)) {
        const { data: p } = await supabaseAdmin
          .from("profiles")
          .select("display_name")
          .eq("id", o)
          .maybeSingle();
        ownerName = p?.display_name?.trim() || "Ami";
      } else {
        ownerName = getProfileById(o)?.name ?? "Ami";
      }
    }

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
