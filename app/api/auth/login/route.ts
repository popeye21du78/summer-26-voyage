import { NextRequest, NextResponse } from "next/server";

const AUTH_CODE = "VAN2024";
const COOKIE_NAME = "van_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

export async function POST(request: NextRequest) {
  let code: string;
  try {
    const body = await request.json();
    code = typeof body?.code === "string" ? body.code.trim() : "";
  } catch {
    code = "";
  }

  if (code !== AUTH_CODE) {
    return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "ok", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
