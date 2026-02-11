import { NextRequest } from "next/server";
import { getCitySection } from "../../../lib/city-sections-supabase";
import { generateSection } from "../../../lib/openai-ville";
import type { SectionType } from "../../../lib/city-prompts";

const VALID_SECTIONS: SectionType[] = [
  "atmosphere",
  "chroniques",
  "guide_epicurien",
  "radar_van",
  "anecdote",
];

/**
 * POST /api/section-ville
 * Body: { stepId, ville, sectionType }
 * Retourne le contenu : depuis le cache ou après génération.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stepId, ville, sectionType } = body;

    if (!stepId || !ville || !sectionType) {
      return Response.json(
        { error: "stepId, ville et sectionType requis" },
        { status: 400 }
      );
    }

    if (!VALID_SECTIONS.includes(sectionType as SectionType)) {
      return Response.json(
        { error: "sectionType invalide" },
        { status: 400 }
      );
    }

    const cached = await getCitySection(stepId, sectionType);
    if (cached?.content) {
      return Response.json({
        content: cached.content,
        fromCache: true,
      });
    }

    const { content } = await generateSection(
      ville,
      stepId,
      sectionType as SectionType
    );

    return Response.json({
      content,
      fromCache: false,
    });
  } catch (e) {
    const err = e as Error;
    console.error("section-ville error:", err.message);
    return Response.json(
      { error: err.message || "Erreur de génération" },
      { status: 500 }
    );
  }
}
