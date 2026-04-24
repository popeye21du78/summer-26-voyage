import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-unified";
import { isAcceptedFriend } from "@/lib/friends-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { serverGetViagoStep, serverUpsertViagoStep } from "@/lib/viago-persist-server";
import type { ViagoStepContent } from "@/lib/viago-storage";

function requireClient() {
  const c = supabaseAdmin;
  if (!c) return null;
  return c;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ voyageId: string; stepId: string }> }
) {
  const client = requireClient();
  if (!client) {
    return NextResponse.json({ error: "Stockage distant indisponible" }, { status: 503 });
  }
  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const { voyageId, stepId } = await context.params;
  if (!voyageId?.trim() || !stepId?.trim()) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  const ownerQ = request.nextUrl.searchParams.get("owner")?.trim() ?? "";
  let rowUserId = auth.userId;
  if (ownerQ) {
    if (auth.kind === "test") {
      return NextResponse.json(
        { error: "Lecture partagée : connecte-toi par e-mail" },
        { status: 403 }
      );
    }
    if (ownerQ !== auth.userId) {
      const ok = await isAcceptedFriend(client, auth.userId, ownerQ);
      if (!ok) {
        return NextResponse.json(
          { error: "Réservé à tes amis acceptés" },
          { status: 403 }
        );
      }
      rowUserId = ownerQ;
    }
  }
  const content = await serverGetViagoStep(client, rowUserId, voyageId, stepId);
  if (!content) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  }
  return NextResponse.json({ content });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ voyageId: string; stepId: string }> }
) {
  const client = requireClient();
  if (!client) {
    return NextResponse.json({ error: "Stockage distant indisponible" }, { status: 503 });
  }
  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const { voyageId, stepId } = await context.params;
  if (!voyageId?.trim() || !stepId?.trim()) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  let body: { content?: ViagoStepContent };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  if (!body.content || typeof body.content !== "object") {
    return NextResponse.json({ error: "content requis" }, { status: 400 });
  }
  const res = await serverUpsertViagoStep(
    client,
    auth.userId,
    voyageId,
    stepId,
    body.content
  );
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ content: res.content, updatedAt: res.updatedAt });
}
