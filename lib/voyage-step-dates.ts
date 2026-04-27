import type { Step } from "@/types";
import type { NuiteeOverride } from "@/lib/voyage-local-overrides";

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
 * Jour du road-trip (1 = jour de l’ancre) à partir d’une date d’étape, en UTC
 * sur les seuls champs Y-M-D (évite le décalage fuseau / « jours = numéro d’étape »).
 */
export function tripDayIndexFromDates(anchorIso: string, stepIso: string): number {
  const [ya, ma, da] = anchorIso.split("-").map(Number);
  const [yb, mb, db] = stepIso.split("-").map(Number);
  if (!ya || !ma || !da || !yb || !mb || !db) return 1;
  const t0 = Date.UTC(ya, ma - 1, da);
  const t1 = Date.UTC(yb, mb - 1, db);
  const diff = Math.round((t1 - t0) / 86400000);
  return Math.max(1, diff + 1);
}

function isPassageLike(
  step: Step,
  n: number,
  nuiteeFromUi: NuiteeOverride | undefined
): boolean {
  if (nuiteeFromUi === "passage") return true;
  if (nuiteeFromUi === "van" || nuiteeFromUi === "airbnb") return false;
  if (n <= 0) return true;
  return step.nuitee_type === "passage";
}

/**
 * Recalcule une date d’arrivée par étape. Les **passages** partagent le même jour
 * calendaire (plusieurs escales le même J1) ; les nuitées font avancer la date d’arrivée
 * (aligné sur `recomputeCreatedStepDates` côté carnet).
 */
export function computeStepArrivalDates(
  orderedSteps: Step[],
  anchorDate: string,
  nuitsByStep: Record<string, number>,
  nuiteeByStepId?: Record<string, NuiteeOverride>
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!anchorDate || !orderedSteps.length) return out;

  let cursor = anchorDate;
  for (const step of orderedSteps) {
    out[step.id] = cursor;
    const n = nuitsByStep[step.id] ?? defaultNuits(step);
    const ov = nuiteeByStepId?.[step.id];
    const isPass = isPassageLike(step, n, ov);
    if (isPass) {
      /* même jour calendaire pour l’escale suivante (plusieurs « passage » = même J) */
      continue;
    }
    const days = Math.max(1, n);
    cursor = addDaysIso(cursor, days);
  }
  return out;
}
