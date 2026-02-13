import { NextRequest } from "next/server";
import { getCitySection } from "../../../lib/city-sections-supabase";
import { generateSection, generateSectionStream } from "../../../lib/openai-ville";
import type { SectionType } from "../../../lib/city-prompts";

const VALID_SECTIONS: SectionType[] = [
  "en_quelques_mots",
  "point_historique",
  "bien_manger_boire",
  "arriver_van",
  "que_faire",
  "anecdote",
];

/**
 * POST /api/section-ville
 * Body: { stepId, ville, sectionType, stream?: boolean }
 * Si stream=true : retourne un flux texte (affichage progressif).
 * Sinon : JSON { content, fromCache }.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stepId, ville, sectionType, stream: wantStream } = body;

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
      if (wantStream) {
        return new Response(cached.content, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      return Response.json({
        content: cached.content,
        fromCache: true,
      });
    }

    if (wantStream) {
      const encoder = new TextEncoder();
      const stream = generateSectionStream(ville, stepId, sectionType as SectionType);
      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                controller.enqueue(encoder.encode(chunk));
              }
            } catch (e) {
              controller.error(e);
            } finally {
              controller.close();
            }
          },
        }),
        {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
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
