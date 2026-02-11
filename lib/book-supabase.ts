import { supabase } from "./supabase";
import type { BookSection, BookSectionStyle } from "../types";

function normalizePhotosArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === "string" && v.length > 0);
  if (val && typeof val === "object" && !Array.isArray(val) && "length" in val) {
    return (Array.from(val as Iterable<unknown>) as string[]).filter((v) => typeof v === "string" && v.length > 0);
  }
  if (typeof val === "string" && val) {
    if (val.startsWith("[")) {
      try {
        const parsed = JSON.parse(val) as unknown;
        return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string" && v.length > 0) : [val];
      } catch {
        return [val];
      }
    }
    if (val.startsWith("{") && val.endsWith("}")) {
      const inner = val.slice(1, -1);
      const parts = inner.match(/("(?:[^"\\]|\\.)*"|[^,]+)/g) ?? [];
      const urls = parts
        .map((p) => p.trim().replace(/^"|"$/g, ""))
        .filter((p) => p && (p.startsWith("http") || p.startsWith("/")));
      if (urls.length > 0) return urls;
    }
    return [val];
  }
  return [];
}

export async function getBookSections(): Promise<BookSection[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("book_sections")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Supabase getBookSections:", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    step_id: row.step_id,
    photos: normalizePhotosArray(row.photos),
    texte: row.texte ?? "",
    style: {
      police_titre: row.police_titre as "serif" | "sans",
      police_sous_titre: row.police_sous_titre as "serif" | "sans",
      gras: row.gras ?? true,
      italique: row.italique ?? false,
      layout: row.layout as "single" | "grid2" | "grid3",
    },
  }));
}

export async function getBookSection(stepId: string): Promise<BookSection | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("book_sections")
    .select("*")
    .eq("step_id", stepId)
    .single();
  if (error || !data) return null;
  return {
    step_id: data.step_id,
    photos: normalizePhotosArray(data.photos),
    texte: data.texte ?? "",
    style: {
      police_titre: data.police_titre as "serif" | "sans",
      police_sous_titre: data.police_sous_titre as "serif" | "sans",
      gras: data.gras ?? true,
      italique: data.italique ?? false,
      layout: data.layout as "single" | "grid2" | "grid3",
    },
  };
}

export async function saveBookSection(
  stepId: string,
  section: { texte: string; style: BookSectionStyle; photos: string[] }
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase non configuré" };
  const { error } = await supabase.from("book_sections").upsert(
    {
      step_id: stepId,
      texte: section.texte,
      photos: section.photos,
      police_titre: section.style.police_titre ?? "serif",
      police_sous_titre: section.style.police_sous_titre ?? "sans",
      gras: section.style.gras ?? true,
      italique: section.style.italique ?? false,
      layout: section.style.layout ?? "single",
    },
    { onConflict: "step_id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
