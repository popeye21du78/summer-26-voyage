import type { CreatedVoyage } from "@/lib/created-voyages";

/**
 * Enregistre l’ébauche côté serveur (Supabase). À appeler avant navigation
 * et après grosses mises à jour, pour ne plus dépendre de l’URL `?v=`.
 */
export async function persistCreatedVoyageOnServer(
  voyage: CreatedVoyage
): Promise<boolean> {
  try {
    const res = await fetch("/api/created-voyage", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(voyage),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteCreatedVoyageOnServer(id: string): Promise<boolean> {
  if (!id.toLowerCase().startsWith("created-")) return false;
  try {
    const res = await fetch(
      `/api/created-voyage?id=${encodeURIComponent(id)}`,
      { method: "DELETE", credentials: "same-origin" }
    );
    return res.ok;
  } catch {
    return false;
  }
}
