import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerAuth } from "@/lib/auth-unified";

const FIRST_LOGIN_COOKIE = "voyage_first_login_date";

/**
 * POST : marque que l'utilisateur a vu la page "journée du jour".
 * Appelé après affichage pour ne plus afficher en full page à la prochaine navigation.
 */
export async function POST() {
  try {
    const auth = await getServerAuth();
    if (!auth) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }
    const cookieStore = await cookies();

    const today = new Date().toDateString();

    // Set cookie (expire à minuit + 1 jour)
    const expires = new Date();
    expires.setHours(23, 59, 59, 999);
    expires.setDate(expires.getDate() + 1);

    cookieStore.set(FIRST_LOGIN_COOKIE, today, {
      path: "/",
      expires,
      httpOnly: true,
      sameSite: "lax",
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("API first-login:", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
