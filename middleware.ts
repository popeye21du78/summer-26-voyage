import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "van_auth";

const PUBLIC_PATHS = ["/", "/login", "/demo"];

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get(COOKIE_NAME)?.value === "ok";
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

  // Non connecté sur une route protégée → landing
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
