import { NextResponse } from "next/server";
import { getVoyagesAmis } from "@/data/mock-friends";
import { getVoyagesAmisForAuthUser } from "@/lib/friends-server";
import { getServerAuth } from "@/lib/auth-unified";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const auth = await getServerAuth();
    if (!auth) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }
    if (auth.kind === "supabase") {
      if (!supabaseAdmin) {
        return NextResponse.json(
          { error: "Service indisponible" },
          { status: 503 }
        );
      }
      const voyages = await getVoyagesAmisForAuthUser(
        supabaseAdmin,
        auth.userId
      );
      if (voyages === null) {
        return NextResponse.json(
          { error: "Erreur amis" },
          { status: 500 }
        );
      }
      return NextResponse.json({ voyages, authMode: "supabase" as const });
    }
    const voyages = getVoyagesAmis(auth.userId);
    return NextResponse.json({ voyages, authMode: "test" as const });
  } catch (e) {
    console.error("API voyages-amis:", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
