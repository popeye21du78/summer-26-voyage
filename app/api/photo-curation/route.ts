import { NextRequest, NextResponse } from "next/server";
import { isUrlValidatedForSlug } from "@/lib/maintenance-photo-validations";

/**
 * GET ?slug=&url= — indique si cette URL est déjà dans les validations pour ce slug.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim().toLowerCase() ?? "";
  const url = req.nextUrl.searchParams.get("url")?.trim() ?? "";
  if (!slug || !url) {
    return NextResponse.json({ error: "slug et url requis" }, { status: 400 });
  }
  const validated = await isUrlValidatedForSlug(slug, url);
  return NextResponse.json({ validated });
}
