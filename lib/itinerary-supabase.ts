import { supabase } from "./supabase";
import type { Step } from "../types";

export type NuiteeType = "van" | "passage" | "airbnb";

export interface ItineraryRow {
  id: string;
  step_id: string;
  nom: string;
  lat: number;
  lng: number;
  ordre: number;
  date_prevue: string | null;
  date_depart?: string | null;
  description_culture: string;
  budget_prevu: number;
  nuitee_type?: NuiteeType | null;
  budget_culture?: number;
  budget_nourriture?: number;
  budget_nuitee?: number;
  /** URL photo Unsplash mise en cache */
  photo_url?: string | null;
}

export async function getItinerary(): Promise<ItineraryRow[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("itinerary")
      .select("*")
      .order("ordre", { ascending: true });
    if (error) {
      console.error("Supabase getItinerary:", error.message, error.code, error.details);
      return [];
    }
    return data ?? [];
  } catch (e) {
    const err = e as Error;
    console.warn("Supabase getItinerary (réseau):", err.message);
    return [];
  }
}

function computeNuitees(arrivee: string | null, depart: string | null): number {
  if (!arrivee || !depart) return 0;
  const d1 = new Date(arrivee);
  const d2 = new Date(depart);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/** Convertit une ligne itinerary en Step (pour la carte, le Book, etc.) */
export function itineraryRowToStep(row: ItineraryRow): Step {
  const nuitees = computeNuitees(row.date_prevue, row.date_depart ?? row.date_prevue);
  return {
    id: row.step_id,
    nom: row.nom,
    coordonnees: { lat: row.lat, lng: row.lng },
    date_prevue: row.date_prevue ?? "",
    date_depart: row.date_depart ?? null,
    nuitees: row.nuitee_type === "van" || row.nuitee_type === "airbnb" ? nuitees : 0,
    description_culture: row.description_culture ?? "",
    budget_prevu: row.budget_prevu ?? 0,
    nuitee_type: row.nuitee_type ?? null,
    budget_culture: row.budget_culture ?? 0,
    budget_nourriture: row.budget_nourriture ?? 0,
    budget_nuitee: row.budget_nuitee ?? 0,
    contenu_voyage: {
    photos: row.photo_url ? [row.photo_url] : [],
    anecdote: "",
  },
  };
}

export async function upsertItinerary(
  rows: Array<{
    step_id: string;
    nom: string;
    lat: number;
    lng: number;
    ordre: number;
    date_prevue?: string | null;
    date_depart?: string | null;
    description_culture?: string;
    budget_prevu?: number;
    nuitee_type?: NuiteeType | null;
    budget_culture?: number;
    budget_nourriture?: number;
    budget_nuitee?: number;
  }>
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase non configuré" };
  try {
    const { error } = await supabase.from("itinerary").upsert(
      rows.map((r) => ({
        step_id: r.step_id,
        nom: r.nom,
        lat: r.lat,
        lng: r.lng,
        ordre: r.ordre,
        date_prevue: r.date_prevue ?? null,
        date_depart: r.date_depart ?? null,
        description_culture: r.description_culture ?? "",
        budget_prevu: r.budget_prevu ?? 0,
        nuitee_type: r.nuitee_type ?? null,
        budget_culture: r.budget_culture ?? 0,
        budget_nourriture: r.budget_nourriture ?? 0,
        budget_nuitee: r.budget_nuitee ?? 0,
      })),
      { onConflict: "step_id" }
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const err = e as Error;
    console.warn("Supabase upsertItinerary (réseau):", err.message);
    return { ok: false, error: err.message };
  }
}

/** Met à jour l'URL photo Unsplash pour une étape (cache). */
export async function updateItineraryPhotoUrl(
  stepId: string,
  photoUrl: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase non configuré" };
  try {
    const { error } = await supabase
      .from("itinerary")
      .update({ photo_url: photoUrl })
      .eq("step_id", stepId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const err = e as Error;
    console.warn("Supabase updateItineraryPhotoUrl (réseau):", err.message);
    return { ok: false, error: err.message };
  }
}

export async function deleteItineraryStep(stepId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase non configuré" };
  try {
    const { error } = await supabase
      .from("itinerary")
      .delete()
      .eq("step_id", stepId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const err = e as Error;
    console.warn("Supabase deleteItineraryStep (réseau):", err.message);
    return { ok: false, error: err.message };
  }
}

/** Supprime les étapes qui ne font plus partie de la liste (pour synchroniser après suppression). */
export async function deleteItineraryStepsNotIn(stepIds: string[]): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase non configuré" };
  const current = await getItinerary();
  const toDelete = current.filter((r) => !stepIds.includes(r.step_id)).map((r) => r.step_id);
  for (const stepId of toDelete) {
    const result = await deleteItineraryStep(stepId);
    if (!result.ok) return result;
  }
  return { ok: true };
}
