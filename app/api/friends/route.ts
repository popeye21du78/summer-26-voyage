import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-unified";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Amis (acceptés + en attente).
 */
export async function GET() {
  const auth = await getServerAuth();
  if (!auth || auth.kind !== "supabase") {
    return NextResponse.json(
      { error: "Réservé aux comptes e-mail" },
      { status: 403 }
    );
  }
  const client = supabaseAdmin;
  if (!client) {
    return NextResponse.json({ error: "Service indisponible" }, { status: 503 });
  }
  const me = auth.userId;
  const { data: edges, error } = await client
    .from("friend_edges")
    .select("id, user_low, user_high, status, requested_by, created_at")
    .or(`user_low.eq.${me},user_high.eq.${me}`);

  if (error) {
    console.error("friends GET", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
  const accepted: { id: string; displayName: string }[] = [];
  const pendingIn: { id: string; displayName: string; fromId: string }[] = [];
  const pendingOut: { id: string; displayName: string; toId: string }[] = [];

  const otherIds = new Set<string>();
  for (const e of edges ?? []) {
    const other = e.user_low === me ? e.user_high : e.user_low;
    otherIds.add(other);
  }
  const { data: profs } = await client
    .from("profiles")
    .select("id, display_name")
    .in("id", [...otherIds]);

  const nameBy = new Map(
    (profs ?? []).map((p) => [p.id, p.display_name] as const)
  );

  for (const e of edges ?? []) {
    const other = e.user_low === me ? e.user_high : e.user_low;
    const name = nameBy.get(other) ?? "…";
    if (e.status === "accepted") {
      accepted.push({ id: other, displayName: name });
    } else if (e.status === "pending") {
      if (e.requested_by === me) {
        pendingOut.push({ id: e.id, displayName: name, toId: other });
      } else {
        pendingIn.push({ id: e.id, displayName: name, fromId: e.requested_by });
      }
    }
  }

  return NextResponse.json({
    me: { id: me, name: auth.email },
    accepted,
    pendingIn,
    pendingOut,
  });
}
