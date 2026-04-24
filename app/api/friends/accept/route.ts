import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-unified";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sortPairIds } from "@/lib/friends-server";

/**
 * Partenaire a envoyé une demande : j’accepte.
 */
export async function POST(request: NextRequest) {
  const auth = await getServerAuth();
  if (!auth || auth.kind !== "supabase") {
    return NextResponse.json(
      { error: "Réservé au compte e-mail" },
      { status: 403 }
    );
  }
  const client = supabaseAdmin;
  if (!client) {
    return NextResponse.json({ error: "Service indisponible" }, { status: 503 });
  }
  let body: { fromUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  const from = typeof body.fromUserId === "string" ? body.fromUserId.trim() : "";
  if (!from) {
    return NextResponse.json({ error: "fromUserId requis" }, { status: 400 });
  }
  const me = auth.userId;
  if (from === me) {
    return NextResponse.json({ error: "Invalide" }, { status: 400 });
  }
  const { low, high } = sortPairIds(me, from);
  const { data: row, error: qe } = await client
    .from("friend_edges")
    .select("id, status, requested_by")
    .eq("user_low", low)
    .eq("user_high", high)
    .maybeSingle();
  if (qe || !row) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ error: "Déjà traité" }, { status: 400 });
  }
  if (row.requested_by !== from) {
    return NextResponse.json({ error: "Cette personne n’a pas initié" }, { status: 400 });
  }
  if (row.requested_by === me) {
    return NextResponse.json({ error: "Tu as déjà demandé" }, { status: 400 });
  }
  const { error: ue } = await client
    .from("friend_edges")
    .update({ status: "accepted" })
    .eq("id", row.id);
  if (ue) {
    console.error("accept", ue);
    return NextResponse.json({ error: "Échec" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
