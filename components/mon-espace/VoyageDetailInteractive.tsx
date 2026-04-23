"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useReturnBase } from "@/lib/hooks/use-return-base";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  MessageCircle,
  Moon,
  Navigation,
  GripVertical,
  MoreHorizontal,
  CalendarRange,
  Utensils,
  Palette,
  BedDouble,
  Plus,
  Car,
  X,
  Loader2,
} from "lucide-react";
import { haversineKm } from "@/lib/geo/haversine";
import {
  loadItineraireOverride,
  saveItineraireOverride,
  type NuiteeOverride,
} from "@/lib/voyage-local-overrides";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CityPhoto } from "@/components/CityPhoto";
import { slugFromNom } from "@/lib/slug-from-nom";
import { withReturnTo } from "@/lib/return-to";
import type { Voyage } from "@/data/mock-voyages";
import type { Step } from "@/types";
import { useProfileId } from "@/lib/hooks/use-profile-id";
import { computeStepArrivalDates, defaultNuits } from "@/lib/voyage-step-dates";

function stepNuiteeKind(step: Step, override: NuiteeOverride | undefined): NuiteeOverride {
  if (override === "passage" || override === "van" || override === "airbnb") return override;
  if (step.nuitee_type === "passage") return "passage";
  if (step.nuitee_type === "airbnb") return "airbnb";
  return "van";
}

function formatDateRange(debut: string, fin: string) {
  const a = new Date(debut);
  const b = new Date(fin);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: a.getFullYear() !== b.getFullYear() ? "numeric" : undefined,
  };
  return `${a.toLocaleDateString("fr-FR", opts)} → ${b.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

/**
 * Capsule d'étape dans "Mon voyage" :
 * - Photo généreuse en fond
 * - Gros badge type hébergement en haut (Passage vs Nuit, bien visible)
 * - Stepper nuits gros + bouton type passage/nuit pour bascule rapide
 * - Poignée de drag isolée pour ne PAS perturber le scroll vertical
 */
function SortableStepRow({
  step,
  dayLabel,
  nuits,
  onNuitsChange,
  onToggleType,
  villeHref,
  dateLabel,
  isPassage,
}: {
  step: Step;
  /** Libellé du ou des jours couverts par l'étape ("J3" ou "J3–4"). */
  dayLabel: string;
  nuits: number;
  onNuitsChange: (stepId: string, n: number) => void;
  onToggleType: (stepId: string, passage: boolean) => void;
  villeHref: string;
  dateLabel: string;
  isPassage: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1,
    zIndex: isDragging ? 30 : "auto",
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="overflow-hidden rounded-3xl border border-white/12 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.28)]"
    >
      <div className="relative h-36">
        <CityPhoto
          stepId={step.id}
          ville={step.nom}
          initialUrl={step.contenu_voyage?.photos?.[0]}
          alt={step.nom}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/35" />

        {/* Badge hébergement haut-gauche : losange corail pour PASSAGE, pilule indigo pour NUIT(s). */}
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          {isPassage ? (
            <span
              className="relative inline-flex h-10 w-10 rotate-45 items-center justify-center rounded-md bg-[var(--color-accent-start)] shadow-[0_6px_18px_rgba(224,120,86,0.45)] ring-1 ring-white/30"
              title="Ville de passage"
            >
              <span className="-rotate-45 font-courier text-[9px] font-bold uppercase tracking-wider text-white">
                Passage
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-indigo-500/90 px-3 py-1.5 font-courier text-[11px] font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-md">
              <Moon className="h-3.5 w-3.5" />
              {nuits} nuit{nuits > 1 ? "s" : ""}
            </span>
          )}
          <span className="flex h-7 items-center justify-center rounded-full bg-white/95 px-2 font-courier text-[11px] font-bold text-[var(--color-bg-main)] shadow-md">
            {dayLabel}
          </span>
        </div>

        {/* Poignée de drag - gros, accessible, clairement séparé du reste */}
        <button
          type="button"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 touch-none items-center justify-center rounded-xl bg-black/55 text-white shadow-lg backdrop-blur-md transition active:scale-95"
          aria-label="Glisser pour réordonner"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Ligne bas : nom + bouton toggle type + stepper nuits */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-3 pb-3">
          <div className="min-w-0 flex-1">
            <Link
              href={villeHref}
              className="block truncate font-courier text-lg font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] underline-offset-2 hover:underline"
            >
              {step.nom}
            </Link>
            <p className="font-courier text-[11px] font-bold text-white/75">
              {dateLabel || "—"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Toggle rapide Passage / Nuit */}
            <button
              type="button"
              onClick={() => onToggleType(step.id, !isPassage)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border backdrop-blur-md transition active:scale-95 ${
                isPassage
                  ? "border-white/25 bg-black/50 text-white/80"
                  : "border-[var(--color-accent-start)]/40 bg-[var(--color-accent-start)]/20 text-[var(--color-accent-start)]"
              }`}
              aria-label={isPassage ? "Passer en nuitée" : "Marquer comme passage"}
              title={isPassage ? "Marquer comme nuit" : "Marquer comme passage"}
            >
              {isPassage ? <Moon className="h-5 w-5" /> : <Navigation className="h-5 w-5" />}
            </button>
            {!isPassage && (
              <div className="flex items-center overflow-hidden rounded-xl border border-white/25 bg-black/55 font-courier text-sm font-bold text-white backdrop-blur-md">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center disabled:opacity-30"
                  disabled={nuits <= 0}
                  onClick={() => onNuitsChange(step.id, Math.max(0, nuits - 1))}
                  aria-label="Retirer une nuit"
                >
                  −
                </button>
                <span className="min-w-[2rem] text-center tabular-nums">{nuits}</span>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center"
                  onClick={() => onNuitsChange(step.id, Math.min(30, nuits + 1))}
                  aria-label="Ajouter une nuit"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Formate une distance en km + durée estimée à ~70 km/h (conduite France mixte). */
function formatKmAndDuration(km: number): string {
  const rounded = Math.round(km);
  const minutes = Math.round((km / 70) * 60);
  if (minutes < 60) return `${rounded} km · ~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${rounded} km · ~${h}h${m.toString().padStart(2, "0")}`;
}

/** Séparateur distance + bouton « + » pour insérer une étape intermédiaire. */
function StepSeparator({
  distanceKm,
  onAdd,
}: {
  distanceKm: number;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="flex-1 border-t border-dashed border-white/15" />
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 font-courier text-[10px] font-bold uppercase tracking-wider text-white/55">
          <Car className="h-3 w-3" />
          {distanceKm > 0 ? formatKmAndDuration(distanceKm) : "Trajet"}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-accent-start)]/45 bg-[var(--color-accent-start)]/20 text-[var(--color-accent-start)] shadow-[0_4px_14px_rgba(224,120,86,0.35)] transition hover:bg-[var(--color-accent-start)]/35 active:scale-95"
          aria-label="Ajouter une étape ici"
          title="Ajouter une étape"
        >
          <Plus className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </div>
      <div className="flex-1 border-t border-dashed border-white/15" />
    </div>
  );
}

type Props = {
  voyage: Voyage;
};

type BudgetSplit = { nourriture: number; culture: number; logement: number };

function defaultBudgetSplit(s: Step): BudgetSplit {
  const nourriture = Math.round(s.budget_nourriture ?? 0) || 25;
  const culture = Math.round(s.budget_culture ?? 0) || 15;
  const logement = Math.round(
    s.budget_nuitee ?? (s.nuitee_type === "passage" ? 0 : 30)
  );
  return { nourriture, culture, logement };
}

function budgetSplitTotal(b: BudgetSplit | undefined): number {
  if (!b) return 0;
  return (b.nourriture || 0) + (b.culture || 0) + (b.logement || 0);
}

export default function VoyageDetailInteractive({ voyage }: Props) {
  const here = useReturnBase();
  const profileId = useProfileId();

  const [detailTab, setDetailTab] = useState<"etapes" | "budget">("etapes");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [stepsOrder, setStepsOrder] = useState<string[]>([]);
  const [nuitsByStep, setNuitsByStep] = useState<Record<string, number>>({});
  const [budgetByStep, setBudgetByStep] = useState<Record<string, BudgetSplit>>({});
  const [nuiteeTypeByStep, setNuiteeTypeByStep] = useState<Record<string, NuiteeOverride>>({});

  const orderStorageKey = useMemo(() => {
    if (profileId === undefined) return "";
    if (profileId) return `voyage_detail_order_${profileId}_${voyage.id}`;
    return `voyage_steps_order_${voyage.id}`;
  }, [profileId, voyage.id]);

  const nuitsStorageKey = useMemo(() => {
    if (!profileId) return "";
    return `voyage_detail_nuits_${profileId}_${voyage.id}`;
  }, [profileId, voyage.id]);

  const budgetStorageKey = useMemo(() => {
    if (!profileId) return "";
    return `voyage_detail_budget_${profileId}_${voyage.id}`;
  }, [profileId, voyage.id]);

  useEffect(() => {
    const ov = loadItineraireOverride(voyage.id);
    const next: Record<string, NuiteeOverride> = {};
    for (const s of voyage.steps) {
      const fromOv = ov?.nuiteeByStepId?.[s.id];
      next[s.id] = stepNuiteeKind(s, fromOv);
    }
    setNuiteeTypeByStep(next);
  }, [voyage.id, voyage.steps]);

  useEffect(() => {
    if (profileId === undefined) return;

    const valid = new Set(voyage.steps.map((s) => s.id));
    const legacyOrderKey = `voyage_steps_order_${voyage.id}`;

    try {
      let raw = orderStorageKey ? localStorage.getItem(orderStorageKey) : null;
      if (!raw && profileId && orderStorageKey !== legacyOrderKey) {
        raw = localStorage.getItem(legacyOrderKey);
        if (raw && orderStorageKey) localStorage.setItem(orderStorageKey, raw);
      }
      if (raw) {
        const ids = JSON.parse(raw) as string[];
        if (Array.isArray(ids)) {
          const filtered = ids.filter((id) => valid.has(id));
          const missing = voyage.steps.map((s) => s.id).filter((id) => !filtered.includes(id));
          setStepsOrder([...filtered, ...missing]);
        } else {
          setStepsOrder(voyage.steps.map((s) => s.id));
        }
      } else {
        setStepsOrder(voyage.steps.map((s) => s.id));
      }
    } catch {
      setStepsOrder(voyage.steps.map((s) => s.id));
    }

    const n: Record<string, number> = {};
    for (const s of voyage.steps) {
      n[s.id] = defaultNuits(s);
    }
    if (nuitsStorageKey) {
      try {
        const nraw = localStorage.getItem(nuitsStorageKey);
        if (nraw) {
          const parsed = JSON.parse(nraw) as Record<string, number>;
          for (const id of Object.keys(parsed)) {
            if (valid.has(id) && typeof parsed[id] === "number" && parsed[id] >= 0) {
              n[id] = parsed[id];
            }
          }
        }
      } catch {
        /* ignore */
      }
    }
    setNuitsByStep(n);

    const b: Record<string, BudgetSplit> = {};
    for (const s of voyage.steps) {
      b[s.id] = defaultBudgetSplit(s);
    }
    if (budgetStorageKey) {
      try {
        const braw = localStorage.getItem(budgetStorageKey);
        if (braw) {
          const parsed = JSON.parse(braw) as Record<
            string,
            number | Partial<BudgetSplit>
          >;
          for (const id of Object.keys(parsed)) {
            if (!valid.has(id)) continue;
            const value = parsed[id];
            if (typeof value === "number" && value >= 0) {
              /** Rétro-compat v1 : un seul total → reparti en 40/25/35 sur les 3 postes. */
              const whole = Math.round(value);
              b[id] = {
                nourriture: Math.round(whole * 0.4),
                culture: Math.round(whole * 0.25),
                logement: Math.round(whole * 0.35),
              };
            } else if (value && typeof value === "object") {
              b[id] = {
                nourriture: Math.max(0, Math.round(value.nourriture ?? b[id]?.nourriture ?? 0)),
                culture: Math.max(0, Math.round(value.culture ?? b[id]?.culture ?? 0)),
                logement: Math.max(0, Math.round(value.logement ?? b[id]?.logement ?? 0)),
              };
            }
          }
        }
      } catch {
        /* ignore */
      }
    }
    setBudgetByStep(b);
  }, [voyage, profileId, orderStorageKey, nuitsStorageKey, budgetStorageKey]);

  const stepById = useMemo(
    () => new Map(voyage.steps.map((s) => [s.id, s])),
    [voyage.steps]
  );

  const orderedSteps = useMemo(() => {
    if (!stepsOrder.length) return voyage.steps;
    const out: Step[] = [];
    for (const id of stepsOrder) {
      const s = stepById.get(id);
      if (s) out.push(s);
    }
    return out;
  }, [stepsOrder, stepById, voyage.steps]);

  const anchorDate = voyage.dateDebut || orderedSteps[0]?.date_prevue || "";

  const stepDates = useMemo(() => {
    if (!anchorDate || !orderedSteps.length) return {};
    return computeStepArrivalDates(orderedSteps, anchorDate, nuitsByStep);
  }, [orderedSteps, anchorDate, nuitsByStep]);

  const dateRangeLabel = useMemo(() => {
    const ids = orderedSteps.map((s) => s.id);
    const first = (ids[0] ? stepDates[ids[0]] : null) ?? orderedSteps[0]?.date_prevue;
    const last =
      (ids.length ? stepDates[ids[ids.length - 1]] : null) ??
      orderedSteps[orderedSteps.length - 1]?.date_prevue;
    if (first && last) return formatDateRange(first, last);
    if (voyage.dateDebut) {
      const end = new Date(voyage.dateDebut);
      end.setDate(end.getDate() + Math.max(0, voyage.dureeJours - 1));
      return formatDateRange(voyage.dateDebut, end.toISOString().slice(0, 10));
    }
    return null;
  }, [orderedSteps, stepDates, voyage]);

  const budgetTotal = useMemo(() => {
    let t = 0;
    for (const s of voyage.steps) {
      t += budgetSplitTotal(budgetByStep[s.id] ?? defaultBudgetSplit(s));
    }
    t += voyage.stats?.essence ?? Math.round((voyage.stats?.km ?? 0) * 0.12);
    return Math.round(t) || 420;
  }, [voyage, budgetByStep]);

  const budgetRows = useMemo(() => {
    let nourriture = 0;
    let culture = 0;
    let logement = 0;
    let essence = voyage.stats?.essence ?? 0;
    for (const s of voyage.steps) {
      const split = budgetByStep[s.id] ?? defaultBudgetSplit(s);
      nourriture += split.nourriture || 0;
      culture += split.culture || 0;
      logement += split.logement || 0;
    }
    if (!essence && voyage.stats?.km) essence = Math.round(voyage.stats.km * 0.12);
    const rows = [
      { categorie: "Nourriture", montant: Math.round(nourriture) || 120 },
      { categorie: "Culture", montant: Math.round(culture) || 90 },
      { categorie: "Logement", montant: Math.round(logement) || 100 },
      { categorie: "Essence", montant: Math.round(essence) || 80 },
    ];
    return rows;
  }, [voyage, budgetByStep]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    /** Touch : delay avant activation → scroll mobile fluide, drag démarre si tap long. */
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /**
   * Durée totale dynamique ET libellé « J{x} » ou « J{x}–{y} » par étape.
   * Règle : passage = 1 jour, sinon max(1, nuits) jours. 0 nuit non-passage est
   * traité comme un passage (fallback cohérent avec l'UI badge losange).
   */
  const { totalDays, dayLabelByStep } = useMemo(() => {
    const labels: Record<string, string> = {};
    let cursor = 1;
    for (const s of orderedSteps) {
      const n = nuitsByStep[s.id] ?? defaultNuits(s);
      const kind = stepNuiteeKind(s, nuiteeTypeByStep[s.id]);
      const isPassage = kind === "passage" || n <= 0;
      const daysHere = isPassage ? 1 : Math.max(1, n);
      labels[s.id] = daysHere === 1 ? `J${cursor}` : `J${cursor}–${cursor + daysHere - 1}`;
      cursor += daysHere;
    }
    return {
      totalDays: cursor - 1 || voyage.dureeJours,
      dayLabelByStep: labels,
    };
  }, [orderedSteps, nuitsByStep, nuiteeTypeByStep, voyage.dureeJours]);

  /** Distances à vol d'oiseau entre chaque étape consécutive. */
  const distancesKm = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < orderedSteps.length - 1; i++) {
      const a = orderedSteps[i];
      const b = orderedSteps[i + 1];
      if (a?.coordonnees && b?.coordonnees) {
        out.push(haversineKm(a.coordonnees, b.coordonnees));
      } else {
        out.push(0);
      }
    }
    return out;
  }, [orderedSteps]);

  /** Dialogue d'ajout d'étape — position = index d'insertion (0…N). */
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [addQuery, setAddQuery] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const closeAddDialog = useCallback(() => {
    setInsertAt(null);
    setAddQuery("");
    setAddError(null);
    setAddBusy(false);
  }, []);

  const onToggleType = useCallback(
    (stepId: string, wantPassage: boolean) => {
      const current = loadItineraireOverride(voyage.id) ?? {
        order: [],
        removed: [],
        nuiteeByStepId: {},
      };
      const nextOverride = {
        ...current,
        nuiteeByStepId: {
          ...current.nuiteeByStepId,
          [stepId]: wantPassage ? ("passage" as const) : ("van" as const),
        },
      };
      saveItineraireOverride(voyage.id, nextOverride);
      setNuiteeTypeByStep((prev) => ({
        ...prev,
        [stepId]: wantPassage ? "passage" : "van",
      }));
      setNuitsByStep((prev) => {
        const copy = { ...prev };
        if (wantPassage) copy[stepId] = 0;
        else if ((copy[stepId] ?? 0) === 0) copy[stepId] = 1;
        if (nuitsStorageKey) {
          try {
            localStorage.setItem(nuitsStorageKey, JSON.stringify(copy));
          } catch {
            /* ignore */
          }
        }
        return copy;
      });
    },
    [voyage.id, nuitsStorageKey]
  );

  const confirmAddStep = useCallback(async () => {
    const q = addQuery.trim();
    if (!q || insertAt === null) return;
    setAddBusy(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("no_geocode");
      const data = (await res.json()) as { lat?: number; lng?: number; name?: string };
      if (typeof data.lat !== "number" || typeof data.lng !== "number") {
        throw new Error("no_geocode");
      }
      const id = `custom-${Date.now()}`;
      const current = loadItineraireOverride(voyage.id) ?? {
        order: stepsOrder,
        removed: [],
        nuiteeByStepId: {},
        customStepsById: {},
      };
      const nextCustom = {
        ...(current.customStepsById ?? {}),
        [id]: {
          id,
          nom: data.name || q,
          lat: data.lat,
          lng: data.lng,
          nuitee_type: "van" as const,
          nuitees: 1,
          contenu_voyage: { photos: [] },
        },
      };
      const nextOrder = [...stepsOrder];
      nextOrder.splice(insertAt, 0, id);
      saveItineraireOverride(voyage.id, {
        ...current,
        order: nextOrder,
        customStepsById: nextCustom,
      });
      if (orderStorageKey) {
        try {
          localStorage.setItem(orderStorageKey, JSON.stringify(nextOrder));
        } catch {
          /* ignore */
        }
      }
      /** On recharge pour que mergeVoyageSteps inclue le customStep. */
      if (typeof window !== "undefined") window.location.reload();
    } catch {
      setAddError("Ville introuvable. Tente un nom plus précis.");
      setAddBusy(false);
    }
  }, [addQuery, insertAt, voyage.id, stepsOrder, orderStorageKey]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = stepsOrder.indexOf(String(active.id));
      const newIndex = stepsOrder.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(stepsOrder, oldIndex, newIndex);
      setStepsOrder(next);
      if (orderStorageKey) {
        try {
          localStorage.setItem(orderStorageKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
    },
    [stepsOrder, orderStorageKey]
  );

  const onNuitsChange = useCallback(
    (stepId: string, n: number) => {
      setNuitsByStep((prev) => {
        const next = { ...prev, [stepId]: n };
        if (nuitsStorageKey) {
          try {
            localStorage.setItem(nuitsStorageKey, JSON.stringify(next));
          } catch {
            /* ignore */
          }
        }
        return next;
      });
    },
    [nuitsStorageKey]
  );

  const onBudgetLineChange = useCallback(
    (stepId: string, field: keyof BudgetSplit, value: number) => {
      const v = Math.max(0, Math.round(value || 0));
      setBudgetByStep((prev) => {
        const current = prev[stepId] ?? { nourriture: 0, culture: 0, logement: 0 };
        const next = { ...prev, [stepId]: { ...current, [field]: v } };
        if (budgetStorageKey) {
          try {
            localStorage.setItem(budgetStorageKey, JSON.stringify(next));
          } catch {
            /* ignore */
          }
        }
        return next;
      });
    },
    [budgetStorageKey]
  );

  return (
    <div className="px-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-courier text-2xl font-bold text-white">{voyage.titre}</h1>
          <p className="mt-1 font-courier text-sm text-white/45">{voyage.sousTitre}</p>
          {dateRangeLabel && (
            <p className="mt-2 flex items-center gap-2 font-courier text-xs text-[var(--color-accent-start)]/90">
              <CalendarRange className="h-3.5 w-3.5 shrink-0" />
              {dateRangeLabel}
              <span className="text-white/35">· {totalDays} j.</span>
            </p>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setToolsOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-[var(--color-accent-start)]/35 hover:text-white"
            aria-expanded={toolsOpen}
            aria-label="Options du voyage"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {toolsOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default bg-transparent"
                aria-label="Fermer le menu"
                onClick={() => setToolsOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#1a1410] py-1 shadow-xl">
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left font-courier text-xs text-white/75 hover:bg-white/5"
                  onClick={() => setToolsOpen(false)}
                >
                  Changer la photo de couverture
                </button>
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left font-courier text-xs text-white/75 hover:bg-white/5"
                  onClick={() => setToolsOpen(false)}
                >
                  Inviter des compagnons
                </button>
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left font-courier text-xs text-white/75 hover:bg-white/5"
                  onClick={() => setToolsOpen(false)}
                >
                  Visibilité (privé / amis / public)
                </button>
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left font-courier text-xs text-white/75 hover:bg-white/5"
                  onClick={() => setToolsOpen(false)}
                >
                  Modifier le titre
                </button>
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left font-courier text-xs text-[var(--color-accent-start)] hover:bg-white/5"
                  onClick={() => {
                    setDetailTab("budget");
                    setToolsOpen(false);
                  }}
                >
                  Statistiques & prévisions budget
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        id="voyage-tabs"
        className="mt-6 flex gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={detailTab === "etapes"}
          onClick={() => setDetailTab("etapes")}
          className={`min-h-[44px] flex-1 rounded-xl font-courier text-xs font-bold uppercase tracking-wide transition ${
            detailTab === "etapes"
              ? "bg-[var(--color-accent-start)] text-white shadow-md"
              : "text-white/40 hover:text-white/65"
          }`}
        >
          Étapes & trajets
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={detailTab === "budget"}
          onClick={() => setDetailTab("budget")}
          className={`min-h-[44px] flex-1 rounded-xl font-courier text-xs font-bold uppercase tracking-wide transition ${
            detailTab === "budget"
              ? "bg-[var(--color-accent-start)] text-white shadow-md"
              : "text-white/40 hover:text-white/65"
          }`}
        >
          Budget (ville / jour)
        </button>
      </div>

      {detailTab === "etapes" && (
        <section className="mt-5">
          <p className="mb-3 font-courier text-[10px] text-white/35">
            Glisse la poignée pour réordonner. Tape « + » entre deux villes pour insérer une étape.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={stepsOrder} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col">
                {orderedSteps.map((s, i) => {
                  const n = nuitsByStep[s.id] ?? defaultNuits(s);
                  const kind = stepNuiteeKind(s, nuiteeTypeByStep[s.id]);
                  const isPassage = kind === "passage" || n <= 0;
                  return (
                    <div key={s.id} className="flex flex-col">
                      <SortableStepRow
                        step={s}
                        dayLabel={dayLabelByStep[s.id] ?? `J${i + 1}`}
                        nuits={n}
                        onNuitsChange={onNuitsChange}
                        onToggleType={onToggleType}
                        isPassage={isPassage}
                        dateLabel={stepDates[s.id] ?? s.date_prevue}
                        villeHref={withReturnTo(
                          `/inspirer/ville/${slugFromNom(s.nom)}?from=voyage`,
                          here
                        )}
                      />
                      {i < orderedSteps.length - 1 && (
                        <StepSeparator
                          distanceKm={distancesKm[i] ?? 0}
                          onAdd={() => setInsertAt(i + 1)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {/* Bouton ajouter une étape en fin d'itinéraire */}
          <button
            type="button"
            onClick={() => setInsertAt(orderedSteps.length)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-accent-start)]/45 bg-[var(--color-accent-start)]/10 py-3.5 font-courier text-xs font-bold uppercase tracking-wider text-[var(--color-accent-start)] transition hover:bg-[var(--color-accent-start)]/20"
          >
            <Plus className="h-4 w-4" />
            Ajouter une étape en fin de voyage
          </button>
        </section>
      )}

      {/* Modal d'ajout d'étape par géocodage */}
      {insertAt !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 px-4 pb-safe sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Annuler"
            className="absolute inset-0 cursor-default bg-transparent"
            onClick={closeAddDialog}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#1a1410] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-courier text-base font-bold text-white">
                  Ajouter une étape
                </h3>
                <p className="mt-1 font-courier text-[11px] text-white/50">
                  {insertAt === 0
                    ? "En tête d'itinéraire"
                    : insertAt >= orderedSteps.length
                      ? "À la fin de l'itinéraire"
                      : `Entre ${orderedSteps[insertAt - 1]?.nom} et ${orderedSteps[insertAt]?.nom}`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddDialog}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/5 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="block">
              <span className="mb-2 block font-courier text-[10px] font-bold uppercase tracking-wider text-white/50">
                Nom de la ville
              </span>
              <input
                type="text"
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                placeholder="Ex. Rochefort"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !addBusy) confirmAddStep();
                }}
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-courier text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--color-accent-start)]/50"
              />
            </label>
            {addError && (
              <p className="mt-2 font-courier text-xs text-red-300">{addError}</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={closeAddDialog}
                className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] py-3 font-courier text-xs font-bold uppercase tracking-wider text-white/70 hover:bg-white/10"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmAddStep}
                disabled={addBusy || !addQuery.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-end)] py-3 font-courier text-xs font-bold uppercase tracking-wider text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110"
              >
                {addBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {detailTab === "budget" && (
        <section id="voyage-budget" className="mt-5 scroll-mt-24">
          <div className="mb-4 rounded-2xl border border-[var(--color-accent-start)]/25 bg-[var(--color-accent-start)]/10 px-4 py-3">
            <p className="font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]/80">
              Total estimé (aperçu)
            </p>
            <p className="mt-1 font-courier text-2xl font-bold text-white">{budgetTotal} €</p>
            <p className="mt-1 font-courier text-[10px] text-white/35">
              Montants par ville enregistrés sur cet appareil (profil connecté).
            </p>
          </div>
          <div className="space-y-3">
            {orderedSteps.map((s) => {
              const split = budgetByStep[s.id] ?? defaultBudgetSplit(s);
              const totalLine = budgetSplitTotal(split);
              const n = nuitsByStep[s.id] ?? defaultNuits(s);
              const kind = stepNuiteeKind(s, nuiteeTypeByStep[s.id]);
              const isPassage = kind === "passage" || n <= 0;
              return (
                <div
                  key={`bud-${s.id}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-courier text-xs font-bold text-white/90">{s.nom}</p>
                      <p className="font-courier text-[10px] text-white/35">
                        {isPassage ? "Passage" : kind === "airbnb" ? "Airbnb" : "Van / nuit"} ·{" "}
                        {(stepDates[s.id] ?? s.date_prevue) || "—"}
                      </p>
                    </div>
                    <p className="font-courier text-xs font-bold text-[var(--color-accent-start)]">
                      {totalLine} €
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <VoyageBudgetField
                      icon={<Utensils className="h-3 w-3" />}
                      label="Nourriture"
                      value={split.nourriture}
                      onChange={(v) => onBudgetLineChange(s.id, "nourriture", v)}
                    />
                    <VoyageBudgetField
                      icon={<Palette className="h-3 w-3" />}
                      label="Culture"
                      value={split.culture}
                      onChange={(v) => onBudgetLineChange(s.id, "culture", v)}
                    />
                    <VoyageBudgetField
                      icon={<BedDouble className="h-3 w-3" />}
                      label="Logement"
                      value={split.logement}
                      onChange={(v) => onBudgetLineChange(s.id, "logement", v)}
                      disabled={isPassage}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <h3 className="mb-2 mt-8 font-courier text-xs font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
            Répartition
          </h3>
          <div className="h-56 w-full rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetRows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <XAxis
                  dataKey="categorie"
                  tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10, fontFamily: "ui-monospace" }}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1410",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontFamily: "ui-monospace",
                    fontSize: 12,
                  }}
                  formatter={(v: number | undefined) => [`${v ?? 0} €`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="montant" fill="var(--color-accent-start)" radius={[6, 6, 0, 0]} name="€" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <Link
        href={`/mon-espace/viago/${voyage.id}`}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-end)] py-3.5 font-courier text-sm font-bold text-white shadow-[0_8px_28px_rgba(224,120,86,0.4)] transition hover:brightness-105"
      >
        <MessageCircle className="h-4 w-4" />
        Ouvrir le Viago
      </Link>
    </div>
  );
}

function VoyageBudgetField({
  icon,
  label,
  value,
  onChange,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex flex-col gap-1 rounded-lg border px-2 py-1.5 ${
        disabled
          ? "border-white/5 bg-white/[0.02] opacity-50"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <span className="flex items-center gap-1 font-courier text-[9px] font-bold uppercase tracking-wider text-white/50">
        {icon}
        {label}
      </span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value || ""}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="no-spinner w-full bg-transparent font-courier text-sm font-bold text-white outline-none placeholder:text-white/20 disabled:cursor-not-allowed"
        />
        <span className="font-courier text-[10px] text-white/40">€</span>
      </div>
    </label>
  );
}
