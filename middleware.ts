import { NextRequest, NextResponse } from "next/server";
import { VALID_PROFILE_IDS } from "./data/test-profiles";
import { updateSupabaseSession } from "./lib/supabase/update-session-middleware";

const COOKIE_NAME = "van_auth";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/auth/callback",
  "/demo",
  "/maintenance",
  "/batch-status",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const { response, user: supaUser } = await updateSupabaseSession(request);
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value ?? "";
  const isTest = VALID_PROFILE_IDS.includes(cookieValue);
  const isLoggedIn = Boolean(supaUser) || isTest;

  if (PUBLIC_PATHS.some((p) => p === pathname)) {
    if (pathname === "/login" && isLoggedIn) {
      return NextResponse.redirect(new URL("/accueil", request.url));
    }
    if (pathname === "/" && isLoggedIn) {
      return NextResponse.redirect(new URL("/accueil", request.url));
    }
    return response;
  }

  const LEGACY_REDIRECTS: Record<string, string> = {
    "/profil": "/mon-espace",
    "/mes-voyages": "/mon-espace",
    "/prevoyages": "/mon-espace",
    "/planifier": "/preparer",
    "/planifier/commencer": "/preparer",
    "/planifier/inspiration": "/inspirer",
  };
  const redirect = LEGACY_REDIRECTS[pathname];
  if (redirect && isLoggedIn) {
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
