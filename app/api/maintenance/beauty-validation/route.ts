import { NextRequest, NextResponse } from "next/server";
import { getBeautyMaintenanceRow } from "@/lib/top-beauty-queue";
import type { BeautyPhotoMeta } from "@/lib/maintenance-beauty-validations";
import {
  appendBeautyUnsplash,
  removeBeautyUnsplash,
  recordBeautyUnsplashReject,
  passBeautyToCommons,
  appendBeautyCommons,
  removeBeautyCommons,
  recordBeautyCommonsReject,
  markBeautySkipped,
  setBeautyScoreEsthetiqueOverride,
  clearBeautyScoreEsthetiqueOverride,
} from "@/lib/maintenance-beauty-validations";

type PhotoBody = Partial<BeautyPhotoMeta> & { url?: string };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      slug?: string;
      action?: string;
      photo?: PhotoBody;
      searchQuery?: string;
      offset?: number;
      score?: number;
    };

    const slug = body.slug?.trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ error: "slug requis" }, { status: 400 });
    }

    if (!getBeautyMaintenanceRow(slug)) {
      return NextResponse.json(
        { error: "Lieu introuvable (patrimoine / lieux-central)" },
        { status: 404 }
      );
    }

    const q = body.searchQuery ?? "";
    const off = typeof body.offset === "number" ? body.offset : 0;

    function toMeta(p: PhotoBody): BeautyPhotoMeta | null {
      if (!p?.url) return null;
      return {
        url: p.url,
        title: String(p.title ?? "").slice(0, 300) || "Photo",
        author: String(p.author ?? "Inconnu"),
        sourceUrl: String(p.sourceUrl ?? ""),
        license: String(p.license ?? ""),
        licenseUrl: String(p.licenseUrl ?? ""),
        width: typeof p.width === "number" ? p.width : 1200,
        height: typeof p.height === "number" ? p.height : 800,
      };
    }

    switch (body.action) {
      case "validate_unsplash": {
        const meta = toMeta(body.photo ?? {});
        if (!meta) return NextResponse.json({ error: "photo requise" }, { status: 400 });
        appendBeautyUnsplash(slug, meta, q);
        return NextResponse.json({ ok: true });
      }
      case "unvalidate_unsplash": {
        const url = body.photo?.url?.trim();
        if (!url) return NextResponse.json({ error: "photo.url requis" }, { status: 400 });
        const ok = removeBeautyUnsplash(slug, url);
        if (!ok) return NextResponse.json({ error: "Photo introuvable" }, { status: 404 });
        return NextResponse.json({ ok: true });
      }
      case "reject_unsplash": {
        recordBeautyUnsplashReject(slug, off, q);
        return NextResponse.json({ ok: true });
      }
      case "pass_to_commons": {
        passBeautyToCommons(slug);
        return NextResponse.json({ ok: true });
      }
      case "validate_commons": {
        const meta = toMeta(body.photo ?? {});
        if (!meta) return NextResponse.json({ error: "photo requise" }, { status: 400 });
        appendBeautyCommons(slug, meta, q);
        return NextResponse.json({ ok: true });
      }
      case "unvalidate_commons": {
        const url = body.photo?.url?.trim();
        if (!url) return NextResponse.json({ error: "photo.url requis" }, { status: 400 });
        const ok = removeBeautyCommons(slug, url);
        if (!ok) return NextResponse.json({ error: "Photo introuvable" }, { status: 404 });
        return NextResponse.json({ ok: true });
      }
      case "reject_commons": {
        recordBeautyCommonsReject(slug, off, q);
        return NextResponse.json({ ok: true });
      }
      case "skip": {
        markBeautySkipped(slug);
        return NextResponse.json({ ok: true });
      }
      case "set_score_esthetique": {
        if (typeof body.score !== "number" || !Number.isFinite(body.score)) {
          return NextResponse.json({ error: "score numérique requis (0–10)" }, { status: 400 });
        }
        setBeautyScoreEsthetiqueOverride(slug, body.score);
        return NextResponse.json({ ok: true });
      }
      case "clear_score_esthetique": {
        clearBeautyScoreEsthetiqueOverride(slug);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "action invalide" }, { status: 400 });
    }
  } catch (e) {
    console.error("beauty-validation:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
