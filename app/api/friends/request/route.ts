import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-unified";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sortPairIds } from "@/lib/friends-server";

export async function POST(request: NextRequest) {
  const auth = await getServerAuth();
  if (!auth || auth.kind !== "supabase") {
    return NextResponse.json(
      { error: "Connecte-toi avec ton e-mail d’abord" },
      { status: 403 }
    );
  }
  const client = supabaseAdmin;
  if (!client) {
    return NextResponse.json({ error: "Service indisponible" }, { status: 503 });
  }
  let body: { toUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  const to = typeof body.toUserId === "string" ? body.toUserId.trim() : "";
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!to || !uuidRe.test(to)) {
    return NextResponse.json(
      { error: "Id utilisateur (UUID) invalide" },
      { status: 400 }
    );
  }
  const me = auth.userId;
  if (to === me) {
    return NextResponse.json({ error: "Tu ne peux pas t’ajouter" }, { status: 400 });
  }
  const { low, high } = sortPairIds(me, to);
  const { data: ex } = await client
    .from("friend_edges")
    .select("id, status, requested_by")
    .eq("user_low", low)
    .eq("user_high", high)
    .maybeSingle();
  if (ex?.status === "accepted") {
    return NextResponse.json({ error: "Déjà amis" }, { status: 400 });
  }
  if (ex?.status === "pending") {
    return NextResponse.json({ error: "Demande déjà en cours" }, { status: 400 });
  }
  const { error } = await client.from("friend_edges").insert({
    user_low: low,
    user_high: high,
    status: "pending",
    requested_by: me,
  });
  if (error) {
    console.error("friend request", error);
    return NextResponse.json({ error: "Échec demande" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
