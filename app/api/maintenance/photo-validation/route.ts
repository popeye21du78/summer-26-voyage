import { NextRequest, NextResponse } from "next/server";
import type { CommonsPhoto } from "@/lib/commons-api";
import {
  appendValidatedPhoto,
  removeValidatedPhoto,
  recordRejectedBatch,
  markSkipped,
} from "@/lib/maintenance-photo-validations";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      slug?: string;
      action?: "validate" | "unvalidate" | "reject_batch" | "skip";
      photo?: CommonsPhoto;
      searchQuery?: string;
      offset?: number;
    };

    const slug = body.slug?.trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ error: "slug requis" }, { status: 400 });
    }

    if (body.action === "validate") {
      if (!body.photo?.url) {
        return NextResponse.json({ error: "photo requise" }, { status: 400 });
      }
      appendValidatedPhoto(slug, body.photo, body.searchQuery ?? "");
      return NextResponse.json({ ok: true });
    }

    if (body.action === "unvalidate") {
      const url = body.photo?.url?.trim();
      if (!url) {
        return NextResponse.json({ error: "photo.url requis" }, { status: 400 });
      }
      const ok = removeValidatedPhoto(slug, url);
      if (!ok) {
        return NextResponse.json({ error: "Photo introuvable dans les validations" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    if (body.action === "reject_batch") {
      const off = typeof body.offset === "number" ? body.offset : 0;
      recordRejectedBatch(slug, off, body.searchQuery ?? "");
      return NextResponse.json({ ok: true });
    }

    if (body.action === "skip") {
      markSkipped(slug);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "action invalide" }, { status: 400 });
  } catch (e) {
    console.error("maintenance photo-validation:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
