import type { NextRequest } from "next/server";
import { VALID_PROFILE_IDS } from "@/data/test-profiles";

const COOKIE = "van_auth";

/** Profil applicatif courant (cookie de test, puis session Supabase). */
export function getSessionProfileId(request: NextRequest): string | null {
  const v = request.cookies.get(COOKIE)?.value?.trim().toLowerCase() ?? "";
  if (v && VALID_PROFILE_IDS.includes(v)) return v;
  return null;
}
