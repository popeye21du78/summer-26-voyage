import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-unified";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { CreatedVoyage } from "@/lib/created-voyages";
import type { Json } from "@/types/supabase";

/**
 * Liste les brouillons `created-*` (sync carnet + écran Mon espace).
 */
export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ drafts: [] as unknown[] });
  }
  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ drafts: [] as unknown[] });
  }
  const { data, error } = await supabaseAdmin
    .from("created_voyage_drafts")
    .select("id, payload, updated_at")
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("created-voyage GET:", error);
    return NextResponse.json({ drafts: [] as unknown[] });
  }
  return NextResponse.json({ drafts: data ?? [] });
}

function isCreatedVoyageShape(x: unknown): x is CreatedVoyage {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    o.id.toLowerCase().startsWith("created-") &&
    typeof o.titre === "string" &&
    Array.isArray(o.steps)
  );
}

/**
 * Poste ou met à jour l’ébauche `created-*` de l’utilisateur connecté.
 */
export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Stockage indisponible" },
        { status: 503 }
      );
    }
    const auth = await getServerAuth();
    if (!auth) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }
    const userId = auth.userId;
    const body: unknown = await req.json();
    if (!isCreatedVoyageShape(body) || body.id.length > 200) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    if (body.id !== body.id.trim()) {
      return NextResponse.json({ error: "id invalide" }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from("created_voyage_drafts").upsert(
      {
        user_id: userId,
        id: body.id,
        payload: body as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,id" }
    );
    if (error) {
      console.error("created-voyage POST:", error);
      return NextResponse.json({ error: "Enregistrement échoué" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("created-voyage POST", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * Supprime l’ébauche (ex. carnet vidé côté client).
 */
export async function DELETE(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Stockage indisponible" },
        { status: 503 }
      );
    }
    const auth = await getServerAuth();
    if (!auth) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim() ?? "";
    if (!id.toLowerCase().startsWith("created-") || id.length > 200) {
      return NextResponse.json({ error: "id invalide" }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("created_voyage_drafts")
      .delete()
      .eq("user_id", auth.userId)
      .eq("id", id);
    if (error) {
      console.error("created-voyage DELETE:", error);
      return NextResponse.json({ error: "Suppression échouée" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("created-voyage DELETE", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
