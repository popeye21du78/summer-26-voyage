/**
 * Coûts des péages par segment de trajet.
 * Clé = "fromId-toId" (ids des étapes dans mock-steps / Supabase).
 * Tu peux compléter ce fichier avec les montants réels (ex. via Bison Futé, sites autoroutes).
 */
export const peagesParSegment: Record<string, number> = {
  "paris-bordeaux": 45.2,
  "bordeaux-biarritz": 18.9,
};

export function getPeage(fromId: string, toId: string): number {
  const key = `${fromId}-${toId}`;
  return peagesParSegment[key] ?? 0;
}
