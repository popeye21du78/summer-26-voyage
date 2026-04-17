"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useReturnBase } from "@/lib/hooks/use-return-base";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
} from "lucide-react";
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

function SortableStepRow({
  step,
  index,
  nuits,
  onNuitsChange,
  villeHref,
  dateLabel,
}: {
  step: Step;
  index: number;
  nuits: number;
  onNuitsChange: (stepId: string, n: number) => void;
  villeHref: string;
  dateLabel: string;
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
    opacity: isDragging ? 0.85 : 1,
  };

  const isPassage = step.nuitee_type === "passage";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
    >
      <div className="relative h-28">
        <CityPhoto
          stepId={step.id}
          ville={step.nom}
          initialUrl={step.contenu_voyage?.photos?.[0]}
          alt={step.nom}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <button
          type="button"
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-black/45 p-2 text-white/70 backdrop-blur-sm touch-manipulation"
          aria-label="Glisser pour réordonner"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-3">
          <div className="min-w-0 pr-2">
            <Link
              href={villeHref}
              className="font-courier text-sm font-bold text-white underline-offset-2 hover:underline"
            >
              {step.nom}
            </Link>
            <p className="font-courier text-[10px] text-white/50">
              {dateLabel || "—"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E07856]/80 font-courier text-[9px] font-bold text-white">
              {index + 1}
            </span>
            {isPassage ? (
              <Navigation className="h-3.5 w-3.5 text-[#E07856]/70" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-[#E07856]/70" />
            )}
            {!isPassage && (
              <div className="flex items-center gap-0.5 rounded-lg bg-black/50 px-1.5 py-0.5 font-courier text-[10px] text-white/90">
                <button
                  type="button"
                  className="px-1.5 disabled:opacity-30"
                  disabled={nuits <= 0}
                  onClick={() => onNuitsChange(step.id, Math.max(0, nuits - 1))}
                >
                  −
                </button>
                <span className="min-w-[1rem] text-center">{nuits} n.</span>
                <button
                  type="button"
                  className="px-1.5"
                  onClick={() => onNuitsChange(step.id, Math.min(30, nuits + 1))}
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

type Props = {
  voyage: Voyage;
};

function defaultBudgetLine(s: Step): number {
  const est =
    (s.budget_nourriture ?? 0) +
    (s.budget_culture ?? 0) +
    (s.budget_nuitee ?? 0) +
    (s.budget_prevu ?? 0) * 0.2;
  return Math.round(est) || 60;
}

export default function VoyageDetailInteractive({ voyage }: Props) {
  const here = useReturnBase();
  const profileId = useProfileId();

  const [detailTab, setDetailTab] = useState<"etapes" | "budget">("etapes");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [stepsOrder, setStepsOrder] = useState<string[]>([]);
  const [nuitsByStep, setNuitsByStep] = useState<Record<string, number>>({});
  const [budgetByStep, setBudgetByStep] = useState<Record<string, number>>({});

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

    const b: Record<string, number> = {};
    for (const s of voyage.steps) {
      b[s.id] = defaultBudgetLine(s);
    }
    if (budgetStorageKey) {
      try {
        const braw = localStorage.getItem(budgetStorageKey);
        if (braw) {
          const parsed = JSON.parse(braw) as Record<string, number>;
          for (const id of Object.keys(parsed)) {
            if (valid.has(id) && typeof parsed[id] === "number" && parsed[id] >= 0) {
              b[id] = Math.round(parsed[id]);
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
      t += budgetByStep[s.id] ?? defaultBudgetLine(s);
    }
    t += voyage.stats?.essence ?? Math.round((voyage.stats?.km ?? 0) * 0.12);
    return Math.round(t) || 420;
  }, [voyage, budgetByStep]);

  const budgetRows = useMemo(() => {
    let nourriture = 0;
    let culture = 0;
    let nuits = 0;
    let essence = voyage.stats?.essence ?? 0;
    for (const s of voyage.steps) {
      nourriture += s.budget_nourriture ?? 0;
      culture += s.budget_culture ?? 0;
      nuits += s.budget_nuitee ?? s.budget_prevu * 0.25;
    }
    if (!essence && voyage.stats?.km) essence = Math.round(voyage.stats.km * 0.12);
    const rows = [
      { categorie: "Nourriture", montant: Math.round(nourriture) || 120 },
      { categorie: "Culture", montant: Math.round(culture) || 90 },
      { categorie: "Essence", montant: Math.round(essence) || 80 },
      { categorie: "Nuitées", montant: Math.round(nuits) || 100 },
    ];
    return rows;
  }, [voyage]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    (stepId: string, value: number) => {
      const v = Math.max(0, Math.round(value));
      setBudgetByStep((prev) => {
        const next = { ...prev, [stepId]: v };
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
            <p className="mt-2 flex items-center gap-2 font-courier text-xs text-[#E07856]/90">
              <CalendarRange className="h-3.5 w-3.5 shrink-0" />
              {dateRangeLabel}
              <span className="text-white/35">· {voyage.dureeJours} j.</span>
            </p>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setToolsOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-[#E07856]/35 hover:text-white"
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
                  className="block w-full px-4 py-2.5 text-left font-courier text-xs text-[#E07856] hover:bg-white/5"
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
              ? "bg-[#E07856] text-white shadow-md"
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
              ? "bg-[#E07856] text-white shadow-md"
              : "text-white/40 hover:text-white/65"
          }`}
        >
          Budget (ville / jour)
        </button>
      </div>

      {detailTab === "etapes" && (
        <section className="mt-5">
          <p className="mb-3 font-courier text-[10px] text-white/35">
            Glisse les poignées pour réordonner. Nuits et dates se mettent à jour (mémorisés sur cet appareil).
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={stepsOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {orderedSteps.map((s, i) => (
                  <SortableStepRow
                    key={s.id}
                    step={s}
                    index={i}
                    nuits={nuitsByStep[s.id] ?? defaultNuits(s)}
                    onNuitsChange={onNuitsChange}
                    dateLabel={stepDates[s.id] ?? s.date_prevue}
                    villeHref={withReturnTo(
                      `/inspirer/ville/${slugFromNom(s.nom)}?from=voyage`,
                      here
                    )}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      )}

      {detailTab === "budget" && (
        <section id="voyage-budget" className="mt-5 scroll-mt-24">
          <div className="mb-4 rounded-2xl border border-[#E07856]/25 bg-[#E07856]/10 px-4 py-3">
            <p className="font-courier text-[10px] font-bold uppercase tracking-wider text-[#E07856]/80">
              Total estimé (aperçu)
            </p>
            <p className="mt-1 font-courier text-2xl font-bold text-white">{budgetTotal} €</p>
            <p className="mt-1 font-courier text-[10px] text-white/35">
              Montants par ville enregistrés sur cet appareil (profil connecté).
            </p>
          </div>
          <div className="space-y-2">
            {orderedSteps.map((s) => {
              const line = budgetByStep[s.id] ?? defaultBudgetLine(s);
              return (
                <div
                  key={`bud-${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-courier text-xs font-bold text-white/90">{s.nom}</p>
                    <p className="font-courier text-[10px] text-white/35">
                      {s.nuitee_type === "passage" ? "Passage" : s.nuitee_type === "airbnb" ? "Airbnb" : "Van / nuit"} ·{" "}
                      {(stepDates[s.id] ?? s.date_prevue) || "—"}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 font-courier text-xs text-white/70">
                    <input
                      type="number"
                      min={0}
                      value={line}
                      onChange={(e) =>
                        onBudgetLineChange(s.id, Number(e.target.value))
                      }
                      className="w-20 rounded-lg border border-white/15 bg-[#1a1410] px-2 py-1 text-right text-white"
                    />
                    €
                  </label>
                </div>
              );
            })}
          </div>
          <h3 className="mb-2 mt-8 font-courier text-xs font-bold uppercase tracking-wider text-[#E07856]">
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
                <Bar dataKey="montant" fill="#E07856" radius={[6, 6, 0, 0]} name="€" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <Link
        href={`/mon-espace/viago/${voyage.id}`}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E07856] to-[#c94a4a] py-3.5 font-courier text-sm font-bold text-white shadow-[0_8px_28px_rgba(224,120,86,0.4)] transition hover:brightness-105"
      >
        <MessageCircle className="h-4 w-4" />
        Ouvrir le Viago
      </Link>
    </div>
  );
}
