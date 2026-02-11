import { supabase } from "./supabase";
import type { SectionType } from "./city-prompts";

export interface CitySectionRow {
  id: string;
  step_id: string;
  section_type: string;
  content: string;
  place_rating: number | null;
}

export async function getCitySection(
  stepId: string,
  sectionType: string
): Promise<CitySectionRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("city_sections")
    .select("*")
    .eq("step_id", stepId)
    .eq("section_type", sectionType)
    .single();
  if (error || !data) return null;
  return data;
}

export async function getCityDiagnostic(stepId: string): Promise<number | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("city_sections")
    .select("place_rating, section_type, content")
    .eq("step_id", stepId);
  for (const row of data ?? []) {
    if (row.place_rating != null) return row.place_rating;
  }
  const { data: diag } = await supabase
    .from("city_sections")
    .select("content")
    .eq("step_id", stepId)
    .eq("section_type", "diagnostic")
    .single();
  if (diag?.content) {
    const n = parseInt(diag.content, 10);
    if (n >= 1 && n <= 4) return n;
  }
  return null;
}

export async function upsertCitySection(
  stepId: string,
  sectionType: string,
  content: string,
  placeRating?: number | null
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase non configuré" };
  try {
    const { error } = await supabase.from("city_sections").upsert(
      {
        step_id: stepId,
        section_type: sectionType,
        content,
        place_rating: placeRating ?? null,
      },
      { onConflict: "step_id,section_type" }
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const err = e as Error;
    return { ok: false, error: err.message };
  }
}

export async function getAllSectionsForStep(
  stepId: string
): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase
    .from("city_sections")
    .select("section_type, content")
    .eq("step_id", stepId);
  const out: Record<string, string> = {};
  const contentSections = ["atmosphere", "chroniques", "guide_epicurien", "radar_van", "anecdote"];
  for (const row of data ?? []) {
    if (row.section_type && row.content && contentSections.includes(row.section_type)) {
      out[row.section_type] = row.content;
    }
  }
  return out;
}
