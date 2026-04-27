"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Truck,
  Fuel,
  X,
  Loader2,
  Trash2,
} from "lucide-react";
import { haversineKm } from "@/lib/geo/haversine";
import {
  getCreatedVoyageById,
  upsertCreatedVoyage,
  removeCreatedVoyage,
  recomputeCreatedStepDates,
  type CreatedVoyage,
  type CreatedVoyageStep,
} from "@/lib/created-voyages";
import {
  deleteCreatedVoyageOnServer,
  persistCreatedVoyageOnServer,
} from "@/lib/created-voyage-server-sync";
import { fetchVoyageRouteForSave } from "@/lib/mapbox-driving-route";
import type { MapboxRouteProfile } from "@/lib/mapbox-route-profile";
import { RouteProfileToggle } from "@/components/RouteProfileToggle";
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
import { useWindowDndAutoscroll } from "@/lib/hooks/use-window-dnd-autoscroll";

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
 * Capsule : photo à gauche (cadrage plus « rectangulaire » : contain + léger dézoom),
 * mince fusion verticale, contrôle à droite. Pas de gros gris qui « mange » l’image.
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
  onRemove,
}: {
  step: Step;
  dayLabel: string;
  nuits: number;
  onNuitsChange: (stepId: string, n: number) => void;
  onToggleType: (stepId: string, passage: boolean) => void;
  villeHref: string;
  dateLabel: string;
  isPassage: boolean;
  onRemove?: () => void;
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
      className="flex min-h-[9.5rem] w-full overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-[var(--color-bg-secondary)] to-[var(--color-bg-gradient-end)] shadow-[0_10px_30px_rgba(0,0,0,0.28)]"
    >
      <div className="relative w-[min(48%,10.5rem)] min-w-0 max-w-[50%] shrink-0 self-stretch overflow-hidden bg-[var(--color-bg-main)] sm:w-[min(44%,10rem)]">
        <div className="absolute inset-0 flex items-center justify-center p-1.5">
          <div className="relative h-full w-full [&_.photo-bw-reveal]:!h-full [&_.photo-bw-reveal]:!w-full [&_.photo-bw-reveal]:!object-contain [&_.photo-bw-reveal]:!object-center [&_.photo-bw-reveal]:!max-h-full [&_.photo-bw-reveal]:!max-w-full [&_.photo-bw-reveal]:scale-90 sm:[&_.photo-bw-reveal]:scale-[0.88]">
            <CityPhoto
              stepId={step.id}
              ville={step.nom}
              initialUrl={step.contenu_voyage?.photos?.[0]}
              alt={step.nom}
              className="absolute inset-0 flex h-full w-full items-center justify-center"
              imageLoading="lazy"
            />
          </div>
        </div>
        {/* Fondu très court, vertical — évite seulement la ligne dure sur le bord droit de la photo */}
        <div
          className="pointer-events-none absolute right-0 top-0 z-[1] h-full w-7 bg-gradient-to-l from-[var(--color-bg-secondary)] from-25% to-transparent to-100% sm:w-8"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 z-[2] flex flex-col justify-end p-2 pt-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent" aria-hidden />
          <div className="relative">
            <Link
              href={villeHref}
              className="line-clamp-2 break-words font-title text-sm font-bold leading-tight text-white drop-shadow-md underline-offset-2 hover:underline sm:text-base"
            >
              {step.nom}
            </Link>
            <p className="mt-0.5 font-courier text-[9px] font-bold text-white/88 sm:text-[10px]">
              {dateLabel || "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-[2] flex min-w-0 flex-1 flex-col justify-between gap-1.5 py-2.5 pl-1 pr-2.5 sm:pl-1.5 sm:pr-3">
        <div className="flex items-start justify-between gap-1">
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 sm:ml-auto sm:max-w-full">
            {isPassage ? (
              <span
                className="relative inline-flex h-7 w-7 rotate-45 items-center justify-center rounded-md bg-[var(--color-accent-start)] shadow-md ring-1 ring-white/20"
                title="Ville de passage"
              >
                <span className="-rotate-45 font-courier text-[6px] font-bold uppercase leading-none text-white">
                  Passage
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-500/88 px-1.5 py-0.5 font-courier text-[8px] font-bold uppercase text-white shadow sm:text-[9px]">
                <Moon className="h-2.5 w-2.5" />
                {nuits} n.
              </span>
            )}
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white/90 px-1 font-courier text-[8px] font-bold text-[var(--color-bg-main)] sm:text-[9px]">
              {dayLabel}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onRemove && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="flex h-8 w-8 touch-manipulation items-center justify-center rounded-lg border border-red-500/30 bg-black/30 text-red-200 shadow backdrop-blur-sm transition hover:bg-red-500/20"
                aria-label="Supprimer cette étape"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              className="flex h-8 w-8 touch-none items-center justify-center rounded-lg border border-white/20 bg-black/30 text-white shadow backdrop-blur-sm"
              aria-label="Glisser pour réordonner"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onToggleType(step.id, !isPassage)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm backdrop-blur-sm transition active:scale-95 ${
              isPassage
                ? "border-white/25 bg-black/20 text-white/85"
                : "border-[var(--color-accent-line-40)] bg-[color-mix(in_srgb,var(--color-accent-start)_20%,transparent)] text-[var(--color-text-primary)]"
            }`}
            aria-label={isPassage ? "Passer en nuitée" : "Marquer comme passage"}
            title={isPassage ? "Marquer comme nuit" : "Marquer comme passage"}
          >
            {isPassage ? <Moon className="h-3.5 w-3.5" /> : <Navigation className="h-3.5 w-3.5" />}
          </button>
          {!isPassage && (
            <div className="flex items-center overflow-hidden rounded-lg border border-white/20 bg-black/30 font-courier text-xs font-bold text-[var(--color-text-primary)] backdrop-blur-sm">
              <button
                type="button"
                className="flex h-8 w-7 items-center justify-center disabled:opacity-30"
                disabled={nuits <= 0}
                onClick={() => onNuitsChange(step.id, Math.max(0, nuits - 1))}
                aria-label="Retirer une nuit"
              >
                −
              </button>
              <span className="min-w-[1.5rem] text-center tabular-nums">{nuits}</span>
              <button
                type="button"
                className="flex h-8 w-7 items-center justify-center"
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

function formatRouteLegLabel(km: number, min: number): string {
  const rounded = Math.round(km);
  if (min < 60) return `${rounded} km · ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${rounded} km · ${h} h ${m} min` : `${rounded} km · ${h} h`;
}

/** Séparateur distance + bouton « + » pour insérer une étape intermédiaire. */
function StepSeparator({
  distanceKm,
  onAdd,
  routeLeg,
}: {
  distanceKm: number;
  onAdd: () => void;
  /** Segment routier Mapbox (remplace l’estimation ~70 km/h). */
  routeLeg?: { distanceKm: number; durationMin: number };
}) {
  const label =
    routeLeg && routeLeg.distanceKm > 0
      ? formatRouteLegLabel(routeLeg.distanceKm, routeLeg.durationMin)
      : distanceKm > 0
        ? formatKmAndDuration(distanceKm)
        : "Trajet";
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="flex-1 border-t border-dashed border-white/15" />
      <div className="flex items-center gap-2">
        {/*
         * Pille « trajet » entre deux villes → police titre (user :
         * « les noms des villes, étapes et trajets »).
         */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 font-title text-[11px] font-bold uppercase tracking-wider text-white/70">
          <Car className="h-3 w-3" />
          {label}
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

/** Prix au litre (€) et consommation (L/100 km) pour le budget carburant. */
type FuelParams = { pricePerLiter: number; litersPer100km: number };
const DEFAULT_FUEL: FuelParams = { pricePerLiter: 1.85, litersPer100km: 7.5 };

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

/** Reconstruit une étape « carnet » à partir d’un Step affiché (ids custom, etc.). */
function stepToCreatedVoyageStep(s: Step): CreatedVoyageStep {
  const isPassage = s.nuitee_type === "passage";
  return {
    id: s.id,
    nom: s.nom,
    type: isPassage ? "passage" : "nuit",
    lat: s.coordonnees.lat,
    lng: s.coordonnees.lng,
    date_prevue: s.date_prevue,
    nights: isPassage ? 0 : Math.max(1, s.nuitees ?? 1),
    budgetNourriture: s.budget_nourriture,
    budgetCulture: s.budget_culture,
    budgetLogement: s.budget_nuitee,
  };
}

export default function VoyageDetailInteractive({ voyage }: Props) {
  const router = useRouter();
  const here = useReturnBase();
  const profileId = useProfileId();
  const isCreatedLocal = voyage.id.startsWith("created-");

  const [detailTab, setDetailTab] = useState<"etapes" | "budget">("etapes");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [stepsOrder, setStepsOrder] = useState<string[]>([]);
  const [nuitsByStep, setNuitsByStep] = useState<Record<string, number>>({});
  const [budgetByStep, setBudgetByStep] = useState<Record<string, BudgetSplit>>({});
  const [nuiteeTypeByStep, setNuiteeTypeByStep] = useState<Record<string, NuiteeOverride>>({});
  const [fuelParams, setFuelParams] = useState<FuelParams>(() => ({ ...DEFAULT_FUEL }));
  const [routeProfile, setRouteProfile] = useState<MapboxRouteProfile>("driving");

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

  const fuelStorageKey = useMemo(() => {
    if (profileId === undefined) return "";
    if (profileId) return `voyage_detail_fuel_${profileId}_${voyage.id}`;
    return `voyage_fuel_${voyage.id}`;
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

    let fp: FuelParams = { ...DEFAULT_FUEL };
    if (fuelStorageKey) {
      try {
        const fraw = localStorage.getItem(fuelStorageKey);
        if (fraw) {
          const parsed = JSON.parse(fraw) as Partial<FuelParams>;
          if (typeof parsed.pricePerLiter === "number" && parsed.pricePerLiter >= 0) {
            fp = { ...fp, pricePerLiter: parsed.pricePerLiter };
          }
          if (typeof parsed.litersPer100km === "number" && parsed.litersPer100km >= 0) {
            fp = { ...fp, litersPer100km: parsed.litersPer100km };
          }
        }
      } catch {
        /* ignore */
      }
    }
    setFuelParams(fp);
  }, [voyage, profileId, orderStorageKey, nuitsStorageKey, budgetStorageKey, fuelStorageKey]);

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

  /** Segments Mapbox valides seulement si l’ordre des étapes n’a pas changé. */
  const mapboxLegsAligned = useMemo(() => {
    if (!voyage.routeLegs?.length) return null;
    if (!isCreatedLocal) return null;
    const orig = getCreatedVoyageById(voyage.id)?.steps.map((s) => s.id) ?? [];
    if (orig.length !== orderedSteps.length) return null;
    const same = orderedSteps.every((s, i) => s.id === orig[i]);
    if (!same) return null;
    return voyage.routeLegs;
  }, [voyage.id, voyage.routeLegs, orderedSteps, isCreatedLocal]);

  const persistCreatedVoyage = useCallback(async (cv: CreatedVoyage) => {
    const wps = cv.steps
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({ lat: s.lat as number, lng: s.lng as number }));
    const prof = cv.routeProfile ?? "driving";
    const route =
      wps.length >= 2
        ? await fetchVoyageRouteForSave(wps, {
            profile: prof,
            excludeMotorway: prof === "driving",
          })
        : null;
    const hasLine = wps.length >= 2 && route?.geometry;
    const next: CreatedVoyage = {
      ...cv,
      routeProfile: prof,
      routeGeometry: hasLine ? (route?.geometry ?? null) : null,
      stats:
        wps.length >= 2 && route
          ? { totalKm: route.distanceKm, totalMin: route.durationMin }
          : wps.length < 2
            ? undefined
            : cv.stats,
      legs: wps.length >= 2 && route ? route.legs : [],
    };
    upsertCreatedVoyage(next);
    void persistCreatedVoyageOnServer(next);
    window.location.reload();
  }, []);

  useEffect(() => {
    const p =
      getCreatedVoyageById(voyage.id)?.routeProfile ??
      voyage.routeProfile ??
      "driving";
    setRouteProfile(p);
  }, [voyage.id, voyage.routeProfile]);

  const applyRouteProfile = useCallback(
    async (p: MapboxRouteProfile) => {
      if (!isCreatedLocal) return;
      const cv = getCreatedVoyageById(voyage.id);
      if (!cv) return;
      setRouteProfile(p);
      await persistCreatedVoyage({ ...cv, routeProfile: p });
    },
    [isCreatedLocal, voyage.id, persistCreatedVoyage]
  );

  const onDateDebutLocalChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isCreatedLocal) return;
      const cv = getCreatedVoyageById(voyage.id);
      if (!cv) return;
      const d = e.target.value;
      if (!d) return;
      const newSteps = recomputeCreatedStepDates(cv.steps, d);
      await persistCreatedVoyage({ ...cv, dateDebut: d, steps: newSteps });
    },
    [isCreatedLocal, voyage.id, persistCreatedVoyage]
  );

  const onRemoveCreatedStep = useCallback(
    async (stepId: string) => {
      if (!isCreatedLocal) return;
      const stored = getCreatedVoyageById(voyage.id);
      const cv: CreatedVoyage =
        stored ??
        ({
          id: voyage.id,
          titre: voyage.titre,
          sousTitre: voyage.sousTitre,
          createdAt: new Date().toISOString(),
          dateDebut: voyage.dateDebut,
          steps: orderedSteps.map((st) => stepToCreatedVoyageStep(st)),
          routeGeometry: voyage.routeGeometry ?? null,
          stats: voyage.stats
            ? { totalKm: voyage.stats.km ?? 0, totalMin: 0 }
            : undefined,
          legs: voyage.routeLegs,
          routeProfile: voyage.routeProfile ?? "driving",
        } as CreatedVoyage);
      const fromCv = new Map(cv.steps.map((x) => [x.id, x]));
      const remaining: CreatedVoyageStep[] = [];
      for (const st of orderedSteps) {
        if (st.id === stepId) continue;
        const row = fromCv.get(st.id) ?? stepToCreatedVoyageStep(st);
        remaining.push(row);
      }
      if (remaining.length === 0) {
        removeCreatedVoyage(voyage.id);
        void deleteCreatedVoyageOnServer(voyage.id);
        try {
          saveItineraireOverride(voyage.id, {
            order: [],
            removed: [],
            nuiteeByStepId: {},
            customStepsById: {},
          });
        } catch {
          /* ignore */
        }
        router.push("/mon-espace");
        return;
      }
      const anchor =
        cv.dateDebut ?? remaining[0].date_prevue ?? new Date().toISOString().slice(0, 10);
      const newSteps = recomputeCreatedStepDates(remaining, anchor);
      const ov = loadItineraireOverride(voyage.id);
      if (ov) {
        const nextCustom = { ...(ov.customStepsById ?? {}) };
        delete nextCustom[stepId];
        saveItineraireOverride(voyage.id, {
          ...ov,
          order: newSteps.map((s) => s.id),
          customStepsById: nextCustom,
        });
      }
      if (orderStorageKey) {
        try {
          localStorage.setItem(orderStorageKey, JSON.stringify(newSteps.map((s) => s.id)));
        } catch {
          /* ignore */
        }
      }
      await persistCreatedVoyage({ ...cv, steps: newSteps });
    },
    [
      isCreatedLocal,
      voyage,
      router,
      persistCreatedVoyage,
      orderedSteps,
      orderStorageKey,
    ]
  );

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

  /** Distance d’itinéraire (hors autoroute prioritaire) — alimente le carburant. */
  const routeKm = voyage.stats?.km ?? 0;

  const fuelCostEuro = useMemo(() => {
    if (routeKm <= 0) return 0;
    const { pricePerLiter, litersPer100km } = fuelParams;
    if (pricePerLiter > 0 && litersPer100km > 0) {
      return Math.round((routeKm / 100) * litersPer100km * pricePerLiter);
    }
    return Math.round(voyage.stats?.essence ?? routeKm * 0.12);
  }, [routeKm, fuelParams, voyage.stats?.essence]);

  const budgetTotal = useMemo(() => {
    let t = 0;
    for (const s of voyage.steps) {
      t += budgetSplitTotal(budgetByStep[s.id] ?? defaultBudgetSplit(s));
    }
    t += fuelCostEuro;
    return Math.round(t) || 420;
  }, [voyage, budgetByStep, fuelCostEuro]);

  const budgetRows = useMemo(() => {
    let nourriture = 0;
    let culture = 0;
    let logement = 0;
    for (const s of voyage.steps) {
      const split = budgetByStep[s.id] ?? defaultBudgetSplit(s);
      nourriture += split.nourriture || 0;
      culture += split.culture || 0;
      logement += split.logement || 0;
    }
    const essence = fuelCostEuro;
    const rows = [
      { categorie: "Nourriture", montant: Math.round(nourriture) || 120 },
      { categorie: "Culture", montant: Math.round(culture) || 90 },
      { categorie: "Logement", montant: Math.round(logement) || 100 },
      { categorie: "Carburant", montant: Math.max(0, Math.round(essence)) || 0 },
    ];
    return rows;
  }, [voyage, budgetByStep, fuelCostEuro]);

  const onFuelParamChange = useCallback(
    (field: keyof FuelParams, raw: string) => {
      const trimmed = raw.replace(",", ".").trim();
      if (trimmed === "") {
        setFuelParams((prev) => {
          const next = { ...prev, [field]: 0 };
          if (fuelStorageKey) {
            try {
              localStorage.setItem(fuelStorageKey, JSON.stringify(next));
            } catch {
              /* ignore */
            }
          }
          return next;
        });
        return;
      }
      const n = parseFloat(trimmed);
      if (Number.isNaN(n) || n < 0) return;
      setFuelParams((prev) => {
        const next = { ...prev, [field]: n };
        if (fuelStorageKey) {
          try {
            localStorage.setItem(fuelStorageKey, JSON.stringify(next));
          } catch {
            /* ignore */
          }
        }
        return next;
      });
    },
    [fuelStorageKey]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    /** Touch : delay avant activation → scroll mobile fluide, drag démarre si tap long. */
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const dndAutoscroll = useWindowDndAutoscroll();

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
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<
    Array<{ name: string; label: string; lat: number; lng: number }>
  >([]);
  const [pendingGeocode, setPendingGeocode] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);
  const suggestReq = useRef(0);

  /** Suggestions Mapbox pendant la saisie (modale ouverte). */
  useEffect(() => {
    if (insertAt === null) {
      setGeocodeSuggestions([]);
      return;
    }
    const q = addQuery.trim();
    if (q.length < 2) {
      setGeocodeSuggestions([]);
      return;
    }
    const my = ++suggestReq.current;
    const t = setTimeout(() => {
      void fetch(`/api/geocode?q=${encodeURIComponent(q)}&limit=6`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { suggestions?: unknown } | null) => {
          if (my !== suggestReq.current) return;
          const list = data?.suggestions;
          if (Array.isArray(list)) {
            setGeocodeSuggestions(
              list.filter(
                (s: unknown): s is { name: string; label: string; lat: number; lng: number } =>
                  typeof s === "object" &&
                  s !== null &&
                  typeof (s as { name?: string }).name === "string" &&
                  typeof (s as { lat?: number }).lat === "number" &&
                  typeof (s as { lng?: number }).lng === "number"
              )
            );
          } else {
            setGeocodeSuggestions([]);
          }
        })
        .catch(() => {
          if (my === suggestReq.current) setGeocodeSuggestions([]);
        });
    }, 300);
    return () => clearTimeout(t);
  }, [addQuery, insertAt]);

  const closeAddDialog = useCallback(() => {
    setInsertAt(null);
    setAddQuery("");
    setAddError(null);
    setAddBusy(false);
    setGeocodeSuggestions([]);
    setPendingGeocode(null);
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
      let data: { lat: number; lng: number; name: string };
      if (
        pendingGeocode &&
        pendingGeocode.name === q
      ) {
        data = { ...pendingGeocode, name: pendingGeocode.name };
      } else {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error("no_geocode");
        const parsed = (await res.json()) as { lat?: number; lng?: number; name?: string };
        if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number") {
          throw new Error("no_geocode");
        }
        data = {
          lat: parsed.lat,
          lng: parsed.lng,
          name: parsed.name ?? q,
        };
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
          nom: data.name,
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
      /** Garde le carnet `created-voyages` aligné + tracé / stats Mapbox à jour. */
      if (voyage.id.startsWith("created-")) {
        const cv = getCreatedVoyageById(voyage.id);
        if (cv) {
          const newStep = {
            id,
            nom: data.name,
            type: "nuit" as const,
            lat: data.lat,
            lng: data.lng,
            nights: 1,
            budgetNourriture: 0,
            budgetCulture: 0,
            budgetLogement: 0,
          };
          const byId = new Map(cv.steps.map((s) => [s.id, { ...s }]));
          byId.set(id, newStep);
          const reordered = nextOrder
            .map((oid) => byId.get(oid))
            .filter((s): s is NonNullable<typeof s> => s != null);
          const anchor =
            cv.dateDebut ?? reordered[0]?.date_prevue ?? new Date().toISOString().slice(0, 10);
          const stepsDated = recomputeCreatedStepDates(reordered, anchor);
          const wps = reordered
            .filter(
              (s) => s.lat != null && s.lng != null && Number.isFinite(s.lat) && Number.isFinite(s.lng)
            )
            .map((s) => ({ lat: s.lat as number, lng: s.lng as number }));
          const prof = cv.routeProfile ?? "driving";
          const route =
            wps.length >= 2
              ? await fetchVoyageRouteForSave(wps, {
                  profile: prof,
                  excludeMotorway: prof === "driving",
                })
              : null;
          const nextCv: CreatedVoyage = {
            ...cv,
            routeProfile: prof,
            steps: stepsDated,
            routeGeometry: route?.geometry ?? null,
            stats: route
              ? { totalKm: route.distanceKm, totalMin: route.durationMin }
              : wps.length < 2
                ? undefined
                : cv.stats,
            legs: wps.length >= 2 && route ? route.legs : [],
          };
          upsertCreatedVoyage(nextCv);
          void persistCreatedVoyageOnServer(nextCv);
        }
      }
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
  }, [addQuery, insertAt, voyage.id, stepsOrder, orderStorageKey, pendingGeocode]);

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
          {isCreatedLocal && (
            <>
              <label className="mt-3 block max-w-[220px]">
                <span className="mb-1 block font-courier text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Date de départ
                </span>
                <input
                  type="date"
                  value={(voyage.dateDebut || anchorDate || "").slice(0, 10)}
                  onChange={(e) => void onDateDebutLocalChange(e)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 font-courier text-sm text-white focus:border-[var(--color-accent-start)]/50 focus:outline-none"
                />
              </label>
              <div className="mt-4 max-w-[min(100%,280px)]">
                <span className="mb-1.5 block font-courier text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Itinéraire
                </span>
                <RouteProfileToggle
                  value={routeProfile}
                  onChange={(p) => void applyRouteProfile(p)}
                  drivingLabel="Van"
                  cyclingLabel="Vélo"
                  DrivingIcon={Truck}
                />
              </div>
            </>
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
            onDragStart={(e) => {
              const ev = e.activatorEvent;
              const y =
                ev && "clientY" in ev && typeof (ev as PointerEvent).clientY === "number"
                  ? (ev as PointerEvent).clientY
                  : undefined;
              dndAutoscroll.start(y);
            }}
            onDragCancel={() => dndAutoscroll.stop()}
            onDragEnd={(e) => {
              dndAutoscroll.stop();
              handleDragEnd(e);
            }}
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
                        onRemove={
                          isCreatedLocal
                            ? () => void onRemoveCreatedStep(s.id)
                            : undefined
                        }
                      />
                      {i < orderedSteps.length - 1 && (
                        <StepSeparator
                          distanceKm={distancesKm[i] ?? 0}
                          onAdd={() => setInsertAt(i + 1)}
                          routeLeg={mapboxLegsAligned?.[i]}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {/*
           * Bouton gros CTA « Ajouter une étape » → police titre
           * (user : « des boutons gros comme ajouter une étape »).
           */}
          <button
            type="button"
            onClick={() => setInsertAt(orderedSteps.length)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-accent-start)]/45 bg-[var(--color-accent-start)]/10 py-3.5 font-title text-sm font-bold uppercase tracking-wider text-[var(--color-accent-start)] transition hover:bg-[var(--color-accent-start)]/20"
          >
            <Plus className="h-4 w-4" />
            Ajouter une étape en fin de voyage
          </button>
        </section>
      )}

      {/* Modal d'ajout d'étape par géocodage */}
      {insertAt !== null && (
        <div
          className="fixed inset-0 z-[220] flex items-end justify-center bg-black/65 px-4 sm:items-center"
          style={{
            paddingBottom: "max(1rem, calc(6.5rem + env(safe-area-inset-bottom, 0px)))",
            paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
          }}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Annuler"
            className="absolute inset-0 cursor-default bg-transparent"
            onClick={closeAddDialog}
          />
          <div className="relative z-[1] max-h-[min(85vh,100%)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#1a1410] p-5 pb-bottom-nav shadow-2xl sm:max-h-[90vh] sm:pb-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-title text-lg font-bold text-white">
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
                onChange={(e) => {
                  const v = e.target.value;
                  setAddQuery(v);
                  setAddError(null);
                  if (pendingGeocode && v.trim() !== pendingGeocode.name) {
                    setPendingGeocode(null);
                  }
                }}
                placeholder="Tape au moins 2 lettres…"
                autoFocus
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !addBusy) confirmAddStep();
                }}
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-courier text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--color-accent-start)]/50"
              />
            </label>
            {geocodeSuggestions.length > 0 && (
              <ul
                className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-black/50"
                role="listbox"
                aria-label="Suggestions de lieux"
              >
                {geocodeSuggestions.map((s) => (
                  <li key={`${s.lng.toFixed(4)}-${s.lat.toFixed(4)}-${s.label}`}>
                    <button
                      type="button"
                      className="w-full px-3 py-2.5 text-left transition hover:bg-white/10"
                      onClick={() => {
                        setAddQuery(s.name);
                        setPendingGeocode({ name: s.name, lat: s.lat, lng: s.lng });
                        setGeocodeSuggestions([]);
                        setAddError(null);
                      }}
                    >
                      <span className="block font-courier text-sm font-bold text-white/95">
                        {s.name}
                      </span>
                      {s.label !== s.name && (
                        <span className="mt-0.5 block line-clamp-2 font-courier text-[10px] text-white/40">
                          {s.label}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
            <p className="font-title text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
              Total estimé (aperçu)
            </p>
            <p className="mt-1 font-title text-2xl font-bold text-white">{budgetTotal} €</p>
            <p className="mt-1 font-courier text-[10px] text-white/35">
              Montants par ville et carburant (selon l’itinéraire sans autoroute) sur cet
              appareil.
            </p>
          </div>

          <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-[var(--color-accent-start)]" />
              <p className="font-courier text-[10px] font-bold uppercase tracking-wider text-white/50">
                Carburant
              </p>
            </div>
            <p className="mt-1 font-courier text-[11px] leading-relaxed text-white/45">
              Distance d’itinéraire utilisée :{" "}
              {routeKm > 0 ? (
                <span className="text-white/80">{routeKm} km</span>
              ) : (
                <span>— (itinéraire indisponible)</span>
              )}{" "}
              (tracé en priorité hors autoroute, comme sur la carte).
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block font-courier text-[9px] font-bold uppercase text-white/40">
                  Prix du carburant (€ / L)
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  inputMode="decimal"
                  value={fuelParams.pricePerLiter}
                  onChange={(e) => onFuelParamChange("pricePerLiter", e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 font-courier text-sm text-white outline-none focus:border-[var(--color-accent-start)]/40"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-courier text-[9px] font-bold uppercase text-white/40">
                  Consommation (L / 100 km)
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  inputMode="decimal"
                  value={fuelParams.litersPer100km}
                  onChange={(e) => onFuelParamChange("litersPer100km", e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 font-courier text-sm text-white outline-none focus:border-[var(--color-accent-start)]/40"
                />
              </label>
            </div>
            <p className="mt-2 font-courier text-xs text-[var(--color-accent-start)]/95">
              Estimation carburant (total) : {fuelCostEuro} €
              {routeKm > 0 && fuelParams.pricePerLiter > 0 && fuelParams.litersPer100km > 0 && (
                <span className="ml-1 text-white/40">
                  (
                  {(
                    (routeKm / 100) *
                    fuelParams.litersPer100km
                  ).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}{" "}
                  L)
                </span>
              )}
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
                      {/* Nom de ville dans la ligne budget → titre */}
                      <p className="font-title text-sm font-bold text-white/95">{s.nom}</p>
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

      {/*
       * CTA principal « Ouvrir le Viago » → police titre, un peu plus
       * gros, bien signé (user : « des boutons gros comme ouvrir le
       * viago »).
       */}
      <Link
        href={`/mon-espace/viago/${voyage.id}`}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-end)] py-3.5 font-title text-base font-bold uppercase tracking-wide text-white shadow-[0_8px_28px_rgba(224,120,86,0.4)] transition hover:brightness-105"
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
