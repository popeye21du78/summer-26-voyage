import type { CreatedVoyage } from "@/lib/created-voyages";

/**
 * Passage Préparer → fiche voyage **sans** dépendre du timing storage / WebView.
 * Même instance JS = disponible dès l’arrivée sur la page (zéro attente “magique”).
 */
const pending = new Map<string, CreatedVoyage>();

export function setCreatedVoyageHandoff(v: CreatedVoyage): void {
  pending.set(v.id, v);
}

export function takeCreatedVoyageHandoff(id: string): CreatedVoyage | null {
  const v = pending.get(id);
  if (!v) return null;
  pending.delete(id);
  return v;
}
