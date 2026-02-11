import { NextRequest, NextResponse } from "next/server";
import {
  getBookSections,
  saveBookSection,
} from "../../../../lib/book-supabase";
import type { BookSectionStyle } from "../../../../types";

export async function GET() {
  try {
    const sections = await getBookSections();
    return NextResponse.json({ sections });
  } catch (e) {
    console.error("API GET book/sections:", e);
    return NextResponse.json({ sections: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { step_id, texte, style, photos } = body as {
      step_id: string;
      texte: string;
      style: BookSectionStyle;
      photos: string[];
    };
    if (!step_id) {
      return NextResponse.json(
        { error: "step_id requis" },
        { status: 400 }
      );
    }
    const result = await saveBookSection(step_id, {
      texte: texte ?? "",
      style: style ?? {},
      photos: Array.isArray(photos) ? photos : [],
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Erreur" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("API POST book/sections:", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
