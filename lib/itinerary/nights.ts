/**
 * Placement des nuits sur un itineraire ordonne.
 *
 * Logique : on parcourt les etapes jour par jour, on accumule le temps de visite.
 * Quand le budget journalier est epuise, on dort au dernier lieu compatible.
 * Si on dort N nuits quelque part, on insere N-1 jours de sejour supplementaires
 * AVANT de repartir.
 */

import type { ItineraryPoint } from "./generate";

export interface NightAssignment {
  pointIdx: number;
  nights: number;
}

export interface DayPlan {
  day: number;
  /** Lieux visites ce jour-la */
  points: ItineraryPoint[];
  /** Lieu ou on dort (null si dernier jour) */
  sleepAt: ItineraryPoint | null;
  /** Nuits restantes a cet endroit APRES ce jour (0 = on repart demain) */
  sleepNights: number;
  /** Jour de sejour (on reste sur place, pas de route) */
  isStayDay: boolean;
}

/**
 * Repartit les etapes en jours et place les nuits.
 * Quand un lieu merite N nuits, on insere N-1 jours de sejour.
 */
export function assignNights(
  points: ItineraryPoint[],
  totalNights: number,
  rythme: "cool" | "normal" | "intense" = "normal"
): DayPlan[] {
  const maxHoursPerDay: Record<string, number> = {
    cool: 6,
    normal: 8,
    intense: 10,
  };
  const budgetMinutes = maxHoursPerDay[rythme] * 60;

  const rawDays: { points: ItineraryPoint[]; sleepAt: ItineraryPoint | null; sleepNights: number }[] = [];
  let currentDay: ItineraryPoint[] = [];
  let dayMinutes = 0;
  let nightsLeft = totalNights;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const visitMinutes = parseDuration(p.dureeRecommandee);

    if (currentDay.length > 0 && dayMinutes + visitMinutes > budgetMinutes) {
      const sleepPoint = findSleepCandidate(currentDay);
      const wantedNights = sleepPoint?.nuitSurPlace
        ? Math.min(suggestNights(sleepPoint), nightsLeft)
        : Math.min(1, nightsLeft);

      rawDays.push({ points: [...currentDay], sleepAt: sleepPoint, sleepNights: wantedNights });
      nightsLeft -= wantedNights;
      currentDay = [p];
      dayMinutes = visitMinutes;
    } else {
      currentDay.push(p);
      dayMinutes += visitMinutes;
    }
  }

  if (currentDay.length > 0) {
    const isLastDay = nightsLeft <= 0;
    const sleepPoint = isLastDay ? null : findSleepCandidate(currentDay);
    const wantedNights = isLastDay ? 0 : Math.min(1, nightsLeft);
    rawDays.push({ points: [...currentDay], sleepAt: sleepPoint, sleepNights: wantedNights });
  }

  // Expandre les jours : si sleepNights > 1, inserer des jours de sejour
  const days: DayPlan[] = [];
  let dayNum = 1;

  for (const raw of rawDays) {
    // Jour de route principal
    days.push({
      day: dayNum++,
      points: raw.points,
      sleepAt: raw.sleepAt,
      sleepNights: raw.sleepNights,
      isStayDay: false,
    });

    // Si N nuits, inserer N-1 jours de sejour
    if (raw.sleepNights > 1 && raw.sleepAt) {
      for (let s = 1; s < raw.sleepNights; s++) {
        days.push({
          day: dayNum++,
          points: [raw.sleepAt],
          sleepAt: raw.sleepAt,
          sleepNights: raw.sleepNights - s,
          isStayDay: true,
        });
      }
    }
  }

  return days;
}

function findSleepCandidate(points: ItineraryPoint[]): ItineraryPoint | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].nuitSurPlace) return points[i];
  }
  return points[points.length - 1] || null;
}

function suggestNights(point: ItineraryPoint): number {
  const cat = point.categorieTaille;
  if (cat === "ville" || point.bucketFamille === "ville") return 2;
  if (cat === "village" || point.bucketFamille === "village") return 1;
  return 1;
}

function parseDuration(dur: string | undefined): number {
  if (!dur) return 120;
  const lower = dur.toLowerCase().trim();
  if (lower.includes("journée") || lower.includes("journee")) {
    const match = lower.match(/(\d+)/);
    return (match ? parseInt(match[1]) : 1) * 480;
  }
  if (lower.includes("demi")) return 240;
  if (lower.includes("nuit")) return 480;
  const hMatch = lower.match(/(\d+)\s*h/);
  if (hMatch) return parseInt(hMatch[1]) * 60;
  const mMatch = lower.match(/(\d+)\s*min/);
  if (mMatch) return parseInt(mMatch[1]);
  return 120;
}
