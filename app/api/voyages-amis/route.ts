import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getVoyagesAmis } from "../../../data/mock-friends";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const profileId = cookieStore.get("van_auth")?.value ?? "";

    if (!profileId) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    const voyages = getVoyagesAmis(profileId);
    return NextResponse.json({ voyages });
  } catch (e) {
    console.error("API voyages-amis:", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
