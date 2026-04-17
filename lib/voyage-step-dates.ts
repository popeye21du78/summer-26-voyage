import type { Step } from "@/types";

export function defaultNuits(s: Step): number {
  if (s.nuitees != null) return s.nuitees;
  return s.nuitee_type === "passage" ? 0 : 1;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Recalcule une date d’arrivée par étape à partir d’une ancre (date de début du voyage)
 * et des nuitées par étape. Passage : avance d’au moins 1 jour pour l’étape suivante.
 */
export function computeStepArrivalDates(
  orderedSteps: Step[],
  anchorDate: string,
  nuitsByStep: Record<string, number>
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!anchorDate || !orderedSteps.length) return out;

  let cursor = anchorDate;
  for (const step of orderedSteps) {
    out[step.id] = cursor;
    const n = nuitsByStep[step.id] ?? defaultNuits(step);
    const isPassage = step.nuitee_type === "passage";
    const days = isPassage ? 1 : Math.max(1, n);
    cursor = addDaysIso(cursor, days);
  }
  return out;
}
