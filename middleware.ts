import { NextRequest, NextResponse } from "next/server";
import { VALID_PROFILE_IDS } from "./data/test-profiles";

const COOKIE_NAME = "van_auth";

const PUBLIC_PATHS = ["/", "/login", "/demo", "/maintenance", "/batch-status"];

export function middleware(request: NextRequest) {
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value ?? "";
  const isLoggedIn = VALID_PROFILE_IDS.includes(cookieValue);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Routes publiques : landing, login, demo
  if (PUBLIC_PATHS.some((p) => p === pathname)) {
    if (pathname === "/login" && isLoggedIn) {
      return NextResponse.redirect(new URL("/accueil", request.url));
    }
    if (pathname === "/" && isLoggedIn) {
      return NextResponse.redirect(new URL("/accueil", request.url));
    }
    return NextResponse.next();
  }

  // Anciennes routes (main) → redirection vers nouvelles routes (app)
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

  // Non connecté sur une route protégée → landing
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
