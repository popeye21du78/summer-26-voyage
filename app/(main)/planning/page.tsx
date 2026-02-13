"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
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
import { mockSteps } from "../../../data/mock-steps";
import type { ItineraryRow } from "../../../lib/itinerary-supabase";
import { getSegmentInfo } from "../../../lib/routeSegments";

function computeJplus(dateStr: string | null, firstDate: string | null): string {
  if (!dateStr || !firstDate) return "—";
  const d1 = new Date(firstDate);
  const d2 = new Date(dateStr);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "J+0";
  return `J+${diff}`;
}

const NUITEE_OPTIONS = [
  { value: "", label: "—" },
  { value: "van", label: "Van" },
  { value: "passage", label: "Passage" },
  { value: "airbnb", label: "AirBnb" },
] as const;

function isNuitee(type: "van" | "passage" | "airbnb" | null | undefined): boolean {
  return type === "van" || type === "airbnb";
}

/** Réajuste les dates après réordonnancement : ordre respecté, van/airbnb à jours distincts. */
/** Les passages prennent la date de DÉPART de la ville du dessus. */
function adjustDatesAfterReorder(rows: ItineraryRow[]): ItineraryRow[] {
  const nuitDates = rows
    .filter((r) => isNuitee(r.nuitee_type) && r.date_prevue)
    .map((r) => r.date_prevue!)
    .filter((d, i, arr) => arr.indexOf(d) === i)
    .sort();
  let nuitIdx = 0;
  let currentDate: string | null = null;
  let lastDeparture: string | null = null; // date de départ pour la ligne suivante
  const firstNuitDate = nuitDates[0] ?? null;
  return rows.map((row) => {
    if (isNuitee(row.nuitee_type)) {
      currentDate = nuitDates[nuitIdx++] ?? currentDate ?? row.date_prevue;
      if (!currentDate && row.date_prevue) currentDate = row.date_prevue;
      if (!currentDate) return { ...row };
      const dep = row.date_depart && row.date_depart >= currentDate
        ? row.date_depart
        : addDays(currentDate, 1);
      lastDeparture = dep;
      return { ...row, date_prevue: currentDate, date_depart: dep };
    }
    // Passage : prend la date de DÉPART de la ville du dessus
    const passageDate = lastDeparture ?? firstNuitDate ?? row.date_prevue;
    lastDeparture = passageDate; // même jour pour un passage
    return { ...row, date_prevue: passageDate };
  });
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateFR(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const j = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const a = d.getFullYear();
  return `${j}/${m}/${a}`;
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function TrajetRow({ from, to }: { from: ItineraryRow; to: ItineraryRow }) {
  const fallback = getSegmentInfo(
    { id: from.step_id, nom: from.nom, coordonnees: { lat: from.lat, lng: from.lng } },
    { id: to.step_id, nom: to.nom, coordonnees: { lat: to.lat, lng: to.lng } }
  );
  const [info, setInfo] = useState<{
    distanceKm: number;
    durationMin: number;
    tollCost: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `/api/directions?from=${from.lat},${from.lng}&to=${to.lat},${to.lng}`;
    fetch(url)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data || typeof data.distanceKm !== "number") return;
        setInfo({
          distanceKm: data.distanceKm,
          durationMin: data.durationMin ?? Math.round((data.distanceKm / 85) * 60),
          tollCost: fallback.tollCost,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [from.lat, from.lng, to.lat, to.lng, fallback.tollCost]);

  const display = info ?? fallback;
  const h = Math.floor(display.durationMin / 60);
  const m = display.durationMin % 60;
  return (
    <tr className="border-b-2 border-[#7a3d22]/40 bg-[#FFF2EB]/40">
      <td colSpan={10} className="px-3 py-2">
        <div className="mx-auto flex max-w-max flex-wrap items-center justify-center gap-x-5 gap-y-1 rounded border-2 border-[#7a3d22] bg-gradient-to-br from-[#c98b6a] via-[#d4a088] to-[#c98b6a] px-4 py-2 text-[12px] text-white shadow-sm">
          <span className="font-medium">
            {from.nom} → {to.nom}
          </span>
          <span>{display.distanceKm} km</span>
          <span>
            {h > 0 ? `${h} h ` : ""}{m} min
          </span>
          <span>
            Péages : {display.tollCost > 0 ? `${display.tollCost.toFixed(1)} €` : "—"}
          </span>
          {!info && (
            <span className="text-white/80" title="Estimation ligne droite">
              *
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function SortableRow({
  row,
  rowIndex,
  firstDate,
  prevRowDate,
  rows,
  onDateArriveeChange,
  onDateDepartChange,
  onNuiteeChange,
  onBudgetCultureChange,
  onBudgetNourritureChange,
  onBudgetNuiteeChange,
  onRemove,
}: {
  row: ItineraryRow;
  rowIndex: number;
  firstDate: string | null;
  prevRowDate: string | null;
  rows: ItineraryRow[];
  onDateArriveeChange: (stepId: string, date: string | null) => void;
  onDateDepartChange: (stepId: string, date: string | null) => void;
  onNuiteeChange: (stepId: string, value: "van" | "passage" | "airbnb" | null) => void;
  onBudgetCultureChange: (stepId: string, value: number) => void;
  onBudgetNourritureChange: (stepId: string, value: number) => void;
  onBudgetNuiteeChange: (stepId: string, value: number) => void;
  onRemove: (stepId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.step_id });

  const [nuiteeMenuOpen, setNuiteeMenuOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<"arrivee" | "depart" | null>(null);
  const [editingBudget, setEditingBudget] = useState<"nuitee" | "culture" | "nourriture" | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const nuiteeButtonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (nuiteeMenuOpen && nuiteeButtonRef.current && typeof document !== "undefined") {
      const rect = nuiteeButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const menuHeight = 120;
      const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
      setMenuPosition({
        left: rect.left,
        top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
        openUp,
      });
    } else {
      setMenuPosition(null);
    }
  }, [nuiteeMenuOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Element;
      if (nuiteeButtonRef.current?.contains(target)) return;
      if (target.closest("[data-nuitee-menu]")) return;
      setNuiteeMenuOpen(false);
    }
    if (nuiteeMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [nuiteeMenuOpen]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const badgeBudgetClass =
    "inline-flex w-[2.75rem] shrink-0 items-center justify-between gap-0.5 rounded-full bg-[#A55734] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white";
  const inputBudgetClass =
    "no-spinner w-6 min-w-0 border-0 bg-transparent py-0 text-right text-[10px] tabular-nums text-white placeholder-white/70 focus:outline-none focus:ring-0 [&::placeholder]:text-white/70";

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b-2 border-[#7a3d22]/50 transition-colors hover:bg-[#FFF2EB]/60 ${
        rowIndex % 2 === 1 ? "bg-[#FFF2EB]/40" : "bg-[#FAF4F0]"
      } ${isDragging ? "opacity-70 shadow-lg ring-1 ring-[#A55734]/25" : ""}`}
    >
      <td className="cursor-grab px-2 py-2" {...attributes} {...listeners}>
        <span className="inline-block text-[#A55734]/60 hover:text-[#A55734]" aria-hidden>⋮⋮</span>
      </td>
      <td className="px-3 py-2 font-medium text-[13px] text-[#333333]">{row.nom}</td>
      <td className="px-3 py-2 text-[12px] text-[#333333]">
        {isNuitee(row.nuitee_type) ? (
          <div className="flex flex-col gap-0.5">
            {/* Arrivée */}
            <div className="flex items-center gap-1">
              {editingDate === "arrivee" ? (
                <input
                  type="date"
                  min={prevRowDate ?? undefined}
                  value={row.date_prevue ?? ""}
                  onChange={(e) => {
                    const newDate = e.target.value || null;
                    if (prevRowDate && newDate && newDate < prevRowDate) return;
                    if (newDate) {
                      const conflict = rows.some(
                        (r) =>
                          r.step_id !== row.step_id &&
                          isNuitee(r.nuitee_type) &&
                          r.date_prevue === newDate
                      );
                      if (conflict) return;
                    }
                    onDateArriveeChange(row.step_id, newDate);
                    setEditingDate(null);
                  }}
                  onBlur={() => setEditingDate(null)}
                  autoFocus
                  className="rounded border border-[#A55734]/50 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-[#A55734]"
                />
              ) : (
                <>
                  <span>Arrivée le : {formatDateFR(row.date_prevue)}</span>
                  <button
                    type="button"
                    onClick={() => setEditingDate("arrivee")}
                    className="text-[#A55734] hover:text-[#8b4728]"
                    title="Modifier"
                    aria-label="Modifier la date d'arrivée"
                  >
                    <CalendarIcon />
                  </button>
                </>
              )}
            </div>
            {/* Départ */}
            <div className="flex items-center gap-1">
              {editingDate === "depart" ? (
                <input
                  type="date"
                  min={row.date_prevue ?? undefined}
                  value={row.date_depart ?? ""}
                  onChange={(e) => {
                    onDateDepartChange(row.step_id, e.target.value || null);
                    setEditingDate(null);
                  }}
                  onBlur={() => setEditingDate(null)}
                  autoFocus
                  className="rounded border border-[#A55734]/50 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-[#A55734]"
                />
              ) : (
                <>
                  <span>Départ le : {formatDateFR(row.date_depart ?? row.date_prevue)}</span>
                  <button
                    type="button"
                    onClick={() => setEditingDate("depart")}
                    className="text-[#A55734] hover:text-[#8b4728]"
                    title="Modifier"
                    aria-label="Modifier la date de départ"
                  >
                    <CalendarIcon />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <span className="text-[#333333]/60">
            {formatDateFR(row.date_prevue)}
          </span>
        )}
      </td>
      <td className="px-2 py-2 text-center text-[12px] tabular-nums text-[#333333]/75">
        {computeJplus(row.date_prevue, firstDate)}
      </td>
      <td className="px-2 py-2 text-center text-[12px] tabular-nums text-[#333333]/75">
        {isNuitee(row.nuitee_type)
          ? computeNuitees(row.date_prevue, row.date_depart ?? row.date_prevue)
          : "—"}
      </td>
      <td className="px-2 py-2">
        <div className="relative">
          <button
            ref={nuiteeButtonRef}
            type="button"
            onClick={() => setNuiteeMenuOpen((o) => !o)}
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
              row.nuitee_type
                ? "bg-[#A55734] text-white hover:bg-[#8b4728]"
                : "border border-[#A55734]/50 bg-transparent text-[#333333]/70 hover:border-[#A55734] hover:text-[#333333]"
            }`}
          >
            {row.nuitee_type
              ? NUITEE_OPTIONS.find((o) => o.value === row.nuitee_type)?.label ?? row.nuitee_type
              : "— Choisir"}
          </button>
          {nuiteeMenuOpen &&
            menuPosition &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                data-nuitee-menu
                className="fixed z-[9999] min-w-[90px] rounded border border-[#A55734]/40 bg-white py-0.5 shadow-lg"
                style={{ left: menuPosition.left, top: menuPosition.top }}
              >
                {NUITEE_OPTIONS.map((o) => (
                  <button
                    key={o.value || "_"}
                    type="button"
                    onClick={() => {
                      onNuiteeChange(row.step_id, o.value ? (o.value as "van" | "passage" | "airbnb") : null);
                      setNuiteeMenuOpen(false);
                    }}
                    className="block w-full px-2 py-1.5 text-left text-[11px] hover:bg-[#FFF2EB]/80"
                  >
                    {o.label}
                  </button>
                ))}
              </div>,
              document.body
            )}
        </div>
      </td>
      <td className="px-3 py-2">
        {row.nuitee_type === "airbnb" ? (
          editingBudget === "nuitee" ? (
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className={badgeBudgetClass}
            >
              <input
                type="number"
                min={0}
                max={999}
                step={5}
                value={(row.budget_nuitee ?? 0) === 0 ? "" : (row.budget_nuitee ?? 0)}
                onChange={(e) =>
                  onBudgetNuiteeChange(row.step_id, Math.max(0, Math.min(999, Number(e.target.value) || 0)))
                }
                onFocus={(e) => e.target.select()}
                onBlur={() => setEditingBudget(null)}
                onKeyDown={(e) => e.key === "Enter" && setEditingBudget(null)}
                autoFocus
                className={inputBudgetClass}
                placeholder="—"
              />
              <span>€</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditingBudget("nuitee")}
              className={`${badgeBudgetClass} cursor-pointer hover:bg-[#8b4728]`}
            >
              <span>{(row.budget_nuitee ?? 0) > 0 ? String(row.budget_nuitee ?? 0) : "—"}</span>
              <span>€</span>
            </button>
          )
        ) : (
          <span className="text-[12px] text-[#333333]/40">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        {editingBudget === "culture" ? (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={badgeBudgetClass}
          >
            <input
              type="number"
              min={0}
              max={999}
              step={5}
              value={(row.budget_culture ?? 0) === 0 ? "" : (row.budget_culture ?? 0)}
              onChange={(e) =>
                onBudgetCultureChange(row.step_id, Math.max(0, Math.min(999, Number(e.target.value) || 0)))
              }
              onFocus={(e) => e.target.select()}
              onBlur={() => setEditingBudget(null)}
              onKeyDown={(e) => e.key === "Enter" && setEditingBudget(null)}
              autoFocus
              className={inputBudgetClass}
              placeholder="—"
            />
            <span>€</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditingBudget("culture")}
            className={`${badgeBudgetClass} cursor-pointer hover:bg-[#8b4728]`}
          >
            <span>{(row.budget_culture ?? 0) > 0 ? String(row.budget_culture ?? 0) : "—"}</span>
            <span>€</span>
          </button>
        )}
      </td>
      <td className="px-3 py-2">
        {editingBudget === "nourriture" ? (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={badgeBudgetClass}
          >
            <input
              type="number"
              min={0}
              max={999}
              step={5}
              value={(row.budget_nourriture ?? 0) === 0 ? "" : (row.budget_nourriture ?? 0)}
              onChange={(e) =>
                onBudgetNourritureChange(row.step_id, Math.max(0, Math.min(999, Number(e.target.value) || 0)))
              }
              onFocus={(e) => e.target.select()}
              onBlur={() => setEditingBudget(null)}
              onKeyDown={(e) => e.key === "Enter" && setEditingBudget(null)}
              autoFocus
              className={inputBudgetClass}
              placeholder="—"
            />
            <span>€</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditingBudget("nourriture")}
            className={`${badgeBudgetClass} cursor-pointer hover:bg-[#8b4728]`}
          >
            <span>{(row.budget_nourriture ?? 0) > 0 ? String(row.budget_nourriture ?? 0) : "—"}</span>
            <span>€</span>
          </button>
        )}
      </td>
      <td className="px-1 py-2 text-right">
        <button
          type="button"
          onClick={() => onRemove(row.step_id)}
          className="rounded p-1 text-[#6b6b6b] transition-colors hover:bg-red-50 hover:text-red-600"
          aria-label="Supprimer"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function computeNuitees(arrivee: string | null, depart: string | null): number {
  if (!arrivee || !depart) return 0;
  const d1 = new Date(arrivee);
  const d2 = new Date(depart);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function mockToItineraryRows(): ItineraryRow[] {
  return mockSteps.map((s, i) => ({
    id: `temp-${s.id}`,
    step_id: s.id,
    nom: s.nom,
    lat: s.coordonnees.lat,
    lng: s.coordonnees.lng,
    ordre: i,
    date_prevue: s.date_prevue,
    date_depart: s.date_depart ?? null,
    description_culture: s.description_culture,
    budget_prevu: s.budget_prevu,
    nuitee_type: s.nuitee_type ?? null,
    budget_culture: s.budget_culture ?? 0,
    budget_nourriture: s.budget_nourriture ?? 0,
    budget_nuitee: s.budget_nuitee ?? 0,
  }));
}

export default function PlanningPage() {
  const [rows, setRows] = useState<ItineraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"ok" | "error" | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addDate, setAddDate] = useState("");
  const [geocodeResult, setGeocodeResult] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [showTrajets, setShowTrajets] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/itinerary");
      const data = await res.json();
      const steps = data.steps ?? [];
      if (steps.length > 0) {
        setRows(steps);
      } else {
        setRows(mockToItineraryRows());
      }
    } catch {
      setRows(mockToItineraryRows());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.step_id === active.id);
    const newIndex = rows.findIndex((r) => r.step_id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(rows, oldIndex, newIndex).map((r, i) => ({
      ...r,
      ordre: i,
    }));
    setRows(adjustDatesAfterReorder(reordered));
  };

  const handleNuiteeChange = (stepId: string, value: "van" | "passage" | "airbnb" | null) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.step_id === stepId);
      return prev.map((r) => {
        if (r.step_id !== stepId) return r;
        if (value === "passage") {
          const prevRow = idx > 0 ? prev[idx - 1] : null;
          const inheritedDate = prevRow
            ? isNuitee(prevRow.nuitee_type)
              ? prevRow.date_depart ?? prevRow.date_prevue
              : prevRow.date_prevue
            : null;
          return { ...r, nuitee_type: value, date_depart: null, date_prevue: inheritedDate ?? r.date_prevue };
        }
        if (value === "van" || value === "airbnb") {
          const dep = r.date_depart && r.date_prevue && r.date_depart >= r.date_prevue
            ? r.date_depart
            : r.date_prevue
              ? addDays(r.date_prevue, 1)
              : null;
          return { ...r, nuitee_type: value, date_depart: dep };
        }
        return { ...r, nuitee_type: value };
      });
    });
  };

  const clampBudget = (v: number) => Math.min(999, Math.max(0, Math.round(v)));

  const handleBudgetCultureChange = (stepId: string, value: number) => {
    setRows((prev) =>
      prev.map((r) => (r.step_id === stepId ? { ...r, budget_culture: clampBudget(value) } : r))
    );
  };

  const handleBudgetNuiteeChange = (stepId: string, value: number) => {
    setRows((prev) =>
      prev.map((r) => (r.step_id === stepId ? { ...r, budget_nuitee: clampBudget(value) } : r))
    );
  };

  const handleBudgetNourritureChange = (stepId: string, value: number) => {
    setRows((prev) =>
      prev.map((r) => (r.step_id === stepId ? { ...r, budget_nourriture: clampBudget(value) } : r))
    );
  };

  const handleDateArriveeChange = (stepId: string, date: string | null) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.step_id !== stepId) return r;
        if (date && r.date_depart && r.date_depart < date) {
          return { ...r, date_prevue: date, date_depart: date };
        }
        return { ...r, date_prevue: date };
      })
    );
  };

  const handleDateDepartChange = (stepId: string, date: string | null) => {
    setRows((prev) =>
      prev.map((r) =>
        r.step_id === stepId ? { ...r, date_depart: date } : r
      )
    );
  };

  const handleRemove = (stepId: string) => {
    setRows((prev) =>
      prev
        .filter((r) => r.step_id !== stepId)
        .map((r, i) => ({ ...r, ordre: i }))
    );
  };

  const handleGeocode = async () => {
    if (!addQuery.trim()) return;
    setGeocoding(true);
    setGeocodeResult(null);
    try {
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(addQuery.trim())}`
      );
      const data = await res.json();
      if (res.ok && data.lat != null && data.lng != null) {
        setGeocodeResult({ lat: data.lat, lng: data.lng, name: data.name });
      } else {
        setMessage("error");
      }
    } catch {
      setMessage("error");
    } finally {
      setGeocoding(false);
    }
  };

  const handleAddStep = () => {
    if (!geocodeResult) return;
    let stepId = slugify(geocodeResult.name);
    let suffix = 1;
    while (rows.some((r) => r.step_id === stepId)) {
      stepId = `${slugify(geocodeResult.name)}-${suffix}`;
      suffix++;
    }
    const newRow: ItineraryRow = {
      id: `new-${stepId}`,
      step_id: stepId,
      nom: geocodeResult.name,
      lat: geocodeResult.lat,
      lng: geocodeResult.lng,
      ordre: rows.length,
      date_prevue: addDate || null,
      date_depart: addDate ? addDays(addDate, 1) : null,
      description_culture: "",
      budget_prevu: 0,
    nuitee_type: null,
    budget_culture: 0,
    budget_nourriture: 0,
    budget_nuitee: 0,
  };
    setRows((prev) => [...prev, newRow]);
    setShowAddForm(false);
    setAddQuery("");
    setAddDate("");
    setGeocodeResult(null);
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: rows.map((r, i) => ({
            ...r,
            ordre: i,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage("ok");
      } else {
        setMessage("error");
      }
    } catch {
      setMessage("error");
    } finally {
      setSaving(false);
    }
  };

  const firstDate =
    rows.length > 0
      ? rows
          .map((r) => r.date_prevue)
          .filter(Boolean)
          .sort()[0] ?? null
      : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-[#333333]/70">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href="/accueil"
        className="mb-8 inline-block text-sm text-[#A55734] hover:underline"
      >
        ← Retour à la carte
      </Link>

      <h1 className="mb-2 text-3xl font-light text-[#333333]">
        Modifier le planning
      </h1>
      <p className="mb-6 text-sm text-[#333333]/70">
        Glisse pour réordonner, modifie les dates. Clique sur Enregistrer pour
        sauvegarder.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="rounded-full border border-[#A55734] px-5 py-2.5 text-sm font-medium text-[#A55734] transition-colors hover:bg-[#A55734]/10"
        >
          + Ajouter une étape
        </button>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#333333]">
          <input
            type="checkbox"
            checked={showTrajets}
            onChange={(e) => setShowTrajets(e.target.checked)}
            className="accent-terracotta h-4 w-4 rounded"
          />
          Afficher les trajets
        </label>
      </div>

      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowAddForm(false)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-lg border border-[#A55734]/30 bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-light text-[#333333]">
              Ajouter une ville
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-[#333333]/80">
                  Nom ou adresse (recherche en France)
                </label>
                <input
                  type="text"
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  placeholder="ex. Marseille, Toulouse…"
                  className="w-full rounded border border-[#A55734]/30 bg-white px-3 py-2 text-[#333333] focus:border-[#A55734] focus:outline-none focus:ring-1 focus:ring-[#A55734]"
                />
              </div>
              <button
                type="button"
                onClick={handleGeocode}
                disabled={geocoding || !addQuery.trim()}
                className="rounded bg-[#A55734] px-4 py-2 text-sm font-medium text-white hover:bg-[#8b4728] disabled:opacity-50"
              >
                {geocoding ? "Recherche…" : "Rechercher"}
              </button>
              {geocodeResult && (
                <>
                  <p className="text-sm text-green-700">
                    ✓ {geocodeResult.name} ({geocodeResult.lat.toFixed(4)},{" "}
                    {geocodeResult.lng.toFixed(4)})
                  </p>
                  <div>
                    <label className="mb-1 block text-sm text-[#333333]/80">
                      Date prévue (optionnel)
                    </label>
                    <input
                      type="date"
                      value={addDate}
                      onChange={(e) => setAddDate(e.target.value)}
                      className="w-full rounded border border-[#A55734]/30 bg-white px-3 py-2 text-[#333333] focus:border-[#A55734] focus:outline-none focus:ring-1 focus:ring-[#A55734]"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="rounded bg-[#A55734] px-4 py-2 text-sm font-medium text-white hover:bg-[#8b4728]"
                    >
                      Ajouter
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="rounded border border-[#A55734]/30 px-4 py-2 text-sm text-[#333333] hover:bg-white/50"
                    >
                      Annuler
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="mb-6 overflow-x-auto overflow-y-hidden rounded-lg border-2 border-[#7a3d22]/70 bg-[#FAF4F0] shadow-sm">
          <table className="w-full table-fixed">
            <thead>
            <tr className="border-b-2 border-[#7a3d22] bg-[#A55734] text-left">
              <th className="w-8 px-2 py-2" aria-hidden />
              <th className="min-w-0 px-3 py-2 text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]">Ville</th>
              <th className="min-w-0 px-3 py-2 text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]"><abbr title="Arrivée / Départ">Dates</abbr></th>
              <th className="w-12 px-2 py-2 text-center text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]"><abbr title="Jours relatifs">J+X</abbr></th>
              <th className="w-12 px-2 py-2 text-center text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]"><abbr title="Nuitées">Nuit.</abbr></th>
              <th className="w-16 px-3 py-2 text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]">Type</th>
              <th className="w-[4.25rem] px-3 py-2 text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]"><abbr title="Budget nuitée">Nuit</abbr></th>
              <th className="w-[4.25rem] px-3 py-2 text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]"><abbr title="Budget culture">Cult</abbr></th>
              <th className="w-[4.25rem] px-3 py-2 text-[11px] font-normal uppercase tracking-wider text-[#FFFBF7]"><abbr title="Budget nourriture">Nourr</abbr></th>
              <th className="w-8 px-2 py-2" aria-hidden />
            </tr>
            </thead>
            <tbody>
              <SortableContext
                items={rows.map((r) => r.step_id)}
                strategy={verticalListSortingStrategy}
              >
                {rows.flatMap((row, idx) => {
                  const sortableRow = (
                    <SortableRow
                      key={row.step_id}
                      row={row}
                      rowIndex={idx}
                      firstDate={firstDate}
                      prevRowDate={
                        idx > 0
                          ? (() => {
                              const prev = rows[idx - 1];
                              // Date de DÉPART de la ville du dessus (passage = même jour)
                              return (isNuitee(prev.nuitee_type)
                                ? prev.date_depart ?? prev.date_prevue
                                : prev.date_prevue) ?? null;
                            })()
                          : null
                      }
                      rows={rows}
                      onDateArriveeChange={handleDateArriveeChange}
                      onDateDepartChange={handleDateDepartChange}
                      onNuiteeChange={handleNuiteeChange}
                      onBudgetCultureChange={handleBudgetCultureChange}
                      onBudgetNourritureChange={handleBudgetNourritureChange}
                      onBudgetNuiteeChange={handleBudgetNuiteeChange}
                      onRemove={handleRemove}
                    />
                  );
                  if (showTrajets && idx < rows.length - 1) {
                    return [
                      sortableRow,
                      <TrajetRow
                        key={`trajet-${row.step_id}-${rows[idx + 1].step_id}`}
                        from={row}
                        to={rows[idx + 1]}
                      />,
                    ];
                  }
                  return [sortableRow];
                })}
              </SortableContext>
            </tbody>
          </table>
        </div>
      </DndContext>

      {rows.length === 0 && (
        <p className="mb-6 text-sm text-[#333333]/70">
          Aucune étape. Les données par défaut ont été chargées.
        </p>
      )}

      {message === "ok" && (
        <p className="mb-4 text-sm text-green-700">Planning enregistré !</p>
      )}
      {message === "error" && (
        <p className="mb-4 text-sm text-red-600">
          Erreur. Vérifie que Supabase est configuré et que la table
          &quot;itinerary&quot; existe.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || rows.length === 0}
        className="rounded-full bg-[#A55734] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#8b4728] disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : "Enregistrer les modifications"}
      </button>

    </main>
  );
}
