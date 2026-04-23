"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Moon,
  Eye,
  Plus,
  Trash2,
  Sparkles,
  Calendar,
  Gauge,
  MapPin,
  GripVertical,
  ChevronDown,
  Utensils,
  Palette,
  BedDouble,
  Wallet,
} from "lucide-react";
import { loadTripDraft, clearTripDraft } from "@/lib/planifier-draft";
import { saveCreatedVoyage } from "@/lib/created-voyages";
import { getCityPoolForDraft, slugifyCityId } from "@/lib/preparer-city-pool";
import ItineraireLiveMap from "@/components/preparer/ItineraireLiveMap";

type StepType = "nuit" | "passage";

type GeneratedStep = {
  id: string;
  nom: string;
  type: StepType;
  lat: number;
  lng: number;
  nights: number;
  budgetNourriture: number;
  budgetCulture: number;
  budgetLogement: number;
};

type CadrageData = {
  dateDebut?: string;
  dateFin?: string;
  rythme?: string;
  lieuSearch?: string;
  days?: number;
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function insertIntermediateCities(
  mainSteps: GeneratedStep[],
  pool: { name: string; lat: number; lng: number }[]
): GeneratedStep[] {
  if (mainSteps.length < 2) return mainSteps;
  const usedNames = new Set(mainSteps.map((s) => s.nom));
  const available = pool.filter((c) => !usedNames.has(c.name));
  const result: GeneratedStep[] = [mainSteps[0]];
  let globalIdx = mainSteps.length;

  for (let i = 0; i < mainSteps.length - 1; i++) {
    const a = mainSteps[i];
    const b = mainSteps[i + 1];
    const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
    const dist = haversineKm(a, b);

    if (dist > 60 && available.length > 0) {
      const sorted = available
        .map((c) => ({ c, d: haversineKm(mid, c) }))
        .sort((x, y) => x.d - y.d);
      const pick = sorted[0];
      if (pick && pick.d < dist * 0.6) {
        const idx = available.indexOf(pick.c);
        if (idx >= 0) available.splice(idx, 1);
        result.push({
          id: slugifyCityId(pick.c.name, globalIdx++),
          nom: pick.c.name,
          type: "passage",
          lat: pick.c.lat,
          lng: pick.c.lng,
          nights: 0,
          budgetNourriture: 0,
          budgetCulture: 0,
          budgetLogement: 0,
        });
      }
    }
    result.push(mainSteps[i + 1]);
  }
  return result;
}

function buildStepsFromPool(
  pool: { name: string; lat: number; lng: number }[],
  days: number
): GeneratedStep[] {
  if (pool.length === 0) return [];
  const count = Math.min(Math.max(3, days + 1), pool.length);
  return pool.slice(0, count).map((c, i) => {
    const type: StepType = i % 3 === 2 ? "passage" : "nuit";
    return {
      id: slugifyCityId(c.name, i),
      nom: c.name,
      lat: c.lat,
      lng: c.lng,
      type,
      nights: type === "nuit" ? 1 : 0,
      budgetNourriture: 0,
      budgetCulture: 0,
      budgetLogement: 0,
    };
  });
}

const RYTHME_LABELS: Record<string, string> = {
  tranquille: "Tranquille",
  equilibre: "Equilibre",
  soutenu: "Dense",
};

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Calcule la date de début (arrivée) de chaque étape depuis un point de départ + cumul des nuits. */
function computeStepDates(
  steps: GeneratedStep[],
  dateDebut: string | undefined
): Array<{ arrivee: string; depart: string } | null> {
  if (!dateDebut) return steps.map(() => null);
  const result: Array<{ arrivee: string; depart: string } | null> = [];
  let cursor = 0;
  for (const s of steps) {
    const arrivee = addDays(dateDebut, cursor);
    const stepDuration = s.type === "nuit" ? Math.max(1, s.nights) : 0;
    const depart = addDays(dateDebut, cursor + Math.max(0, stepDuration - (s.type === "nuit" ? 0 : 0)));
    result.push({ arrivee, depart });
    cursor += stepDuration;
  }
  return result;
}

export default function CreateItineraire() {
  const router = useRouter();
  const [steps, setSteps] = useState<GeneratedStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [cadrage, setCadrage] = useState<CadrageData>({});
  const [regionLabel, setRegionLabel] = useState("Mon voyage");
  const [openBudgetId, setOpenBudgetId] = useState<string | null>(null);

  /** Capteurs @dnd-kit : pointer (desktop) + touch (mobile) + clavier, avec tolérance au scroll. */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const draft = loadTripDraft();
    const cadrageRaw =
      typeof window !== "undefined" ? localStorage.getItem("preparer-cadrage") : null;
    const cad: CadrageData = cadrageRaw ? JSON.parse(cadrageRaw) : {};
    setCadrage(cad);
    setRegionLabel(draft?.zone?.regionLabel ?? "Mon voyage");

    const days = cad.days ?? draft?.zone?.days ?? 7;
    const pool = getCityPoolForDraft(draft?.zone?.regionKey, draft?.fromTerritoryId);
    const generated = buildStepsFromPool(pool, days);
    setSteps(generated);
    setLoading(false);
  }, []);

  const toggleType = useCallback((id: string) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (s.type === "nuit") return { ...s, type: "passage", nights: 0 };
        return { ...s, type: "nuit", nights: Math.max(1, s.nights) };
      })
    );
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateNights = useCallback((id: string, nights: number) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, nights: Math.max(1, Math.min(30, nights)) } : s
      )
    );
  }, []);

  const updateBudget = useCallback(
    (id: string, key: "budgetNourriture" | "budgetCulture" | "budgetLogement", value: number) => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, [key]: Math.max(0, Math.floor(value || 0)) } : s
        )
      );
    },
    []
  );

  /** Drag & drop via @dnd-kit — mêmes capteurs que « Mon voyage » pour parité mobile / desktop. */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSteps((prev) => {
      const from = prev.findIndex((s) => s.id === active.id);
      const to = prev.findIndex((s) => s.id === over.id);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => {
      const draft = loadTripDraft();
      const pool = getCityPoolForDraft(draft?.zone?.regionKey, draft?.fromTerritoryId);
      const used = new Set(prev.map((p) => p.nom));
      const nextCity = pool.find((c) => !used.has(c.name));
      const newStep = (city: { name: string; lat: number; lng: number }): GeneratedStep => ({
        id: slugifyCityId(city.name, prev.length),
        nom: city.name,
        lat: city.lat,
        lng: city.lng,
        type: "passage",
        nights: 0,
        budgetNourriture: 0,
        budgetCulture: 0,
        budgetLogement: 0,
      });
      if (!nextCity) {
        const fallback = getCityPoolForDraft(undefined, undefined);
        const extra = fallback.find((c) => !used.has(c.name));
        if (!extra) return prev;
        return [...prev, newStep(extra)];
      }
      return [...prev, newStep(nextCity)];
    });
  }, []);

  const nuits = useMemo(
    () => steps.filter((s) => s.type === "nuit").reduce((acc, s) => acc + Math.max(1, s.nights), 0),
    [steps]
  );
  const passages = useMemo(() => steps.filter((s) => s.type === "passage").length, [steps]);

  const stepDates = useMemo(
    () => computeStepDates(steps, cadrage.dateDebut),
    [steps, cadrage.dateDebut]
  );

  const totalDays = useMemo(
    () => steps.reduce((acc, s) => acc + (s.type === "nuit" ? Math.max(1, s.nights) : 0), 0),
    [steps]
  );

  const totalBudget = useMemo(
    () =>
      steps.reduce(
        (acc, s) =>
          acc + (s.budgetNourriture || 0) + (s.budgetCulture || 0) + (s.budgetLogement || 0),
        0
      ),
    [steps]
  );

  function handleCreate() {
    const draft = loadTripDraft();
    const cadrageRaw =
      typeof window !== "undefined" ? localStorage.getItem("preparer-cadrage") : null;
    const cad: CadrageData = cadrageRaw ? JSON.parse(cadrageRaw) : {};

    const label = draft?.zone?.regionLabel ?? "Mon voyage";
    const voyageId = `created-${Date.now()}`;

    const today = new Date();
    const startDate = cad.dateDebut ? new Date(cad.dateDebut) : today;

    const rhythmLabel =
      cad.rythme === "tranquille"
        ? "tranquille"
        : cad.rythme === "soutenu"
          ? "dense"
          : "équilibré";

    const pool = getCityPoolForDraft(draft?.zone?.regionKey, draft?.fromTerritoryId);
    const withIntermediates = insertIntermediateCities(steps, pool);

    let cursor = 0;
    saveCreatedVoyage({
      id: voyageId,
      titre: label,
      sousTitre: `${withIntermediates.length} étapes · ${rhythmLabel}`,
      createdAt: new Date().toISOString(),
      steps: withIntermediates.map((s) => {
        const date = new Date(startDate.getTime() + cursor * 86400000)
          .toISOString()
          .split("T")[0];
        cursor += s.type === "nuit" ? Math.max(1, s.nights) : 0;
        return {
          id: s.id,
          nom: s.nom,
          type: s.type,
          lat: s.lat,
          lng: s.lng,
          date_prevue: date,
          nights: s.nights,
          budgetNourriture: s.budgetNourriture,
          budgetCulture: s.budgetCulture,
          budgetLogement: s.budgetLogement,
        };
      }),
    });

    clearTripDraft();
    if (typeof window !== "undefined") {
      localStorage.removeItem("preparer-cadrage");
    }
    router.push("/preparer/itineraire?done=1");
  }

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center bg-gradient-to-b from-[var(--color-bg-main)] to-[var(--color-bg-gradient-end)]">
        <p className="voyage-loading-text text-sm uppercase tracking-widest">
          voyage voyage…
        </p>
      </main>
    );
  }

  return (
    <main className="flex h-full flex-col bg-gradient-to-b from-[var(--color-bg-main)] to-[var(--color-bg-gradient-end)]">
      <div className="pb-bottom-nav min-h-0 flex-1 overflow-y-auto px-5 py-6">
        {/* En-tête */}
        <p className="font-courier text-[10px] font-bold uppercase tracking-[0.45em] text-[var(--color-accent-start)]">
          Récapitulatif
        </p>
        <h1 className="mt-2 font-courier text-2xl font-bold leading-tight text-[var(--color-text-primary)]">
          {regionLabel}
        </h1>

        {/* Bandeau récap — verre + tokens */}
        <div className="mt-5 space-y-3">
          {cadrage.dateDebut && (
            <div className="viago-glass-card flex items-center gap-3 px-4 py-3">
              <Calendar className="h-4 w-4 shrink-0 text-[var(--color-accent-start)]" />
              <div className="font-courier text-sm text-[var(--color-text-primary)]/80">
                {formatDate(cadrage.dateDebut)}
                {totalDays > 0 && (
                  <>
                    {" → "}
                    {formatDate(addDays(cadrage.dateDebut, totalDays))}
                    <span className="ml-2 text-[var(--color-text-secondary)]">
                      · {totalDays} jour{totalDays > 1 ? "s" : ""}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {cadrage.rythme && (
            <div className="viago-glass-card flex items-center gap-3 px-4 py-3">
              <Gauge className="h-4 w-4 shrink-0 text-[var(--color-accent-start)]" />
              <span className="font-courier text-sm text-[var(--color-text-primary)]/80">
                Rythme {RYTHME_LABELS[cadrage.rythme] ?? cadrage.rythme}
              </span>
            </div>
          )}

          <div className="viago-glass-card flex items-center gap-3 px-4 py-3">
            <MapPin className="h-4 w-4 shrink-0 text-[var(--color-accent-start)]" />
            <span className="font-courier text-sm text-[var(--color-text-primary)]/80">
              {steps.length} étapes · {nuits} nuit{nuits > 1 ? "s" : ""} · {passages} passage
              {passages > 1 ? "s" : ""}
            </span>
          </div>

          {totalBudget > 0 && (
            <div className="viago-glass-card viago-glass-card--accent-border flex items-center gap-3 px-4 py-3">
              <Wallet className="h-4 w-4 shrink-0 text-[var(--color-accent-start)]" />
              <span className="font-courier text-sm text-[var(--color-text-primary)]/80">
                Budget estimé · {totalBudget.toLocaleString("fr-FR")} €
              </span>
            </div>
          )}
        </div>

        {/**
         * Carte Mapbox LIVE : reflète en temps réel l'état `steps`.
         * Chaque ajout d'étape (nuit ou passage) ou réordonnancement via
         * le drag & drop se répercute ici — le numéro affiché sur chaque
         * pastille suit l'ordre des étapes dans le récap.
         */}
        <div className="mt-5 h-[260px] w-full">
          <ItineraireLiveMap
            className="h-full w-full"
            steps={steps}
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          />
        </div>

        {/* Liste des étapes avec drag & drop */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-courier text-sm font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
              Étapes
            </h2>
            <button
              onClick={addStep}
              className="flex items-center gap-1 rounded-full border border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] px-3 py-1 font-courier text-[10px] font-bold text-[var(--color-accent-start)] backdrop-blur-md transition hover:border-[color-mix(in_srgb,var(--color-accent-start)_45%,transparent)]"
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </button>
          </div>

          <p className="mb-3 font-courier text-[10px] italic text-[var(--color-text-secondary)]">
            Maintiens la poignée pour glisser une étape, clique l&apos;œil / la lune
            pour alterner passage et nuit.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={steps.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {steps.map((step, i) => {
                  const dates = stepDates[i];
                  const budgetOpen = openBudgetId === step.id;
                  return (
                    <SortableStepRow
                      key={step.id}
                      step={step}
                      index={i}
                      dates={dates}
                      budgetOpen={budgetOpen}
                      onToggleType={toggleType}
                      onRemove={removeStep}
                      onUpdateNights={updateNights}
                      onUpdateBudget={updateBudget}
                      onToggleBudget={() =>
                        setOpenBudgetId((prev) => (prev === step.id ? null : step.id))
                      }
                    />
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>

          <p className="mt-3 font-courier text-[10px] text-[var(--color-text-secondary)]">
            Des villes intermédiaires seront ajoutées automatiquement entre les étapes éloignées.
          </p>
        </div>

        {/* CTA principal */}
        <button
          onClick={handleCreate}
          className="viago-cta-primary mt-8"
        >
          <Sparkles className="h-4 w-4" />
          Créer ce voyage
        </button>
      </div>
    </main>
  );
}

function SortableStepRow({
  step,
  index,
  dates,
  budgetOpen,
  onToggleType,
  onRemove,
  onUpdateNights,
  onUpdateBudget,
  onToggleBudget,
}: {
  step: GeneratedStep;
  index: number;
  dates: { arrivee: string; depart: string } | null;
  budgetOpen: boolean;
  onToggleType: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateNights: (id: string, nights: number) => void;
  onUpdateBudget: (
    id: string,
    key: "budgetNourriture" | "budgetCulture" | "budgetLogement",
    value: number
  ) => void;
  onToggleBudget: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const isNuit = step.type === "nuit";
  const budgetTotal =
    (step.budgetNourriture || 0) +
    (step.budgetCulture || 0) +
    (step.budgetLogement || 0);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    ...(!isNuit
      ? {
          borderColor:
            "color-mix(in srgb, var(--color-accent-start) 28%, var(--color-glass-border))",
        }
      : {}),
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`viago-glass-card overflow-hidden transition ${
        isDragging ? "opacity-70 shadow-[0_12px_32px_rgba(0,0,0,0.35)] ring-2 ring-[var(--color-accent-start)]" : ""
      }`}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          className="flex cursor-grab touch-none items-center px-1 text-[var(--color-text-secondary)] transition active:cursor-grabbing hover:text-[var(--color-text-primary)]"
          aria-label="Glisser pour réorganiser"
          title="Glisser pour réorganiser"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-accent-start)_22%,transparent)] font-courier text-[10px] font-bold text-[var(--color-accent-start)]">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-courier text-sm font-bold text-[var(--color-text-primary)]">
            {step.nom}
          </p>
          <p className="mt-0.5 truncate font-courier text-[10.5px] text-[var(--color-text-secondary)]">
            {isNuit
              ? dates
                ? `${formatDateShort(dates.arrivee)} · ${step.nights} nuit${step.nights > 1 ? "s" : ""}`
                : `${step.nights} nuit${step.nights > 1 ? "s" : ""}`
              : "Arrêt en cours de route"}
          </p>
        </div>

        <button
          onClick={() => onToggleType(step.id)}
          className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-courier text-[10px] font-bold transition ${
            isNuit
              ? "bg-[color-mix(in_srgb,var(--color-accent-start)_18%,transparent)] text-[var(--color-accent-start)]"
              : "bg-[var(--color-glass-bg)] text-[var(--color-text-secondary)]"
          }`}
          aria-label={isNuit ? "Transformer en passage" : "Transformer en nuit"}
        >
          {isNuit ? <Moon className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {isNuit ? "Nuit" : "Passage"}
        </button>

        <button
          onClick={onToggleBudget}
          className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-courier text-[10px] font-bold transition ${
            budgetTotal > 0
              ? "bg-[color-mix(in_srgb,var(--color-accent-gold)_22%,transparent)] text-[var(--color-accent-gold)]"
              : "bg-[var(--color-glass-bg)] text-[var(--color-text-secondary)]"
          }`}
          aria-expanded={budgetOpen}
          aria-label="Budget de l'étape"
        >
          <Wallet className="h-3 w-3" />
          {budgetTotal > 0 ? `${budgetTotal}€` : "Budget"}
          <ChevronDown
            className={`h-3 w-3 transition-transform ${budgetOpen ? "rotate-180" : ""}`}
          />
        </button>

        <button
          onClick={() => onRemove(step.id)}
          className="shrink-0 text-[var(--color-text-secondary)] transition hover:text-[var(--color-accent-deep)]"
          aria-label="Supprimer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {isNuit && (
        <div
          className="flex items-center justify-between gap-3 border-t px-3 py-2"
          style={{ borderColor: "var(--color-glass-border)" }}
        >
          <span className="font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Nuits sur place
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onUpdateNights(step.id, step.nights - 1)}
              disabled={step.nights <= 1}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-glass-border)] font-courier text-sm font-bold text-[var(--color-text-primary)] transition disabled:opacity-30 hover:border-[color-mix(in_srgb,var(--color-accent-start)_40%,transparent)]"
            >
              −
            </button>
            <span className="min-w-[2rem] text-center font-courier text-sm font-bold text-[var(--color-text-primary)]">
              {step.nights}
            </span>
            <button
              type="button"
              onClick={() => onUpdateNights(step.id, step.nights + 1)}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-glass-border)] font-courier text-sm font-bold text-[var(--color-text-primary)] transition hover:border-[color-mix(in_srgb,var(--color-accent-start)_40%,transparent)]"
            >
              +
            </button>
          </div>
        </div>
      )}

      {budgetOpen && (
        <div
          className="grid grid-cols-3 gap-2 border-t px-3 py-3"
          style={{ borderColor: "var(--color-glass-border)" }}
        >
          <BudgetField
            icon={<Utensils className="h-3 w-3" />}
            label="Nourriture"
            value={step.budgetNourriture}
            onChange={(v) => onUpdateBudget(step.id, "budgetNourriture", v)}
          />
          <BudgetField
            icon={<Palette className="h-3 w-3" />}
            label="Culture"
            value={step.budgetCulture}
            onChange={(v) => onUpdateBudget(step.id, "budgetCulture", v)}
          />
          <BudgetField
            icon={<BedDouble className="h-3 w-3" />}
            label="Logement"
            value={step.budgetLogement}
            onChange={(v) => onUpdateBudget(step.id, "budgetLogement", v)}
            disabled={!isNuit}
          />
        </div>
      )}
    </li>
  );
}

function BudgetField({
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
      className={`flex flex-col gap-1 rounded-xl border px-2.5 py-2 transition ${
        disabled ? "opacity-40" : ""
      }`}
      style={{
        borderColor: "var(--color-glass-border)",
        background: "color-mix(in srgb, var(--color-glass-bg) 50%, transparent)",
      }}
    >
      <span className="flex items-center gap-1 font-courier text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
        {icon}
        {label}
      </span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={99999}
          value={value || ""}
          placeholder="0"
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="no-spinner w-full bg-transparent font-courier text-sm font-bold text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-secondary)]"
        />
        <span className="font-courier text-[10px] text-[var(--color-text-secondary)]">€</span>
      </div>
    </label>
  );
}
