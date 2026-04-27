"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, MapPin, Plus, Sparkles, Trash2, X } from "lucide-react";
import {
  DndContext,
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveCreatedVoyage } from "@/lib/created-voyages";
import { fetchVoyageRoute, fetchVoyageRouteForSave } from "@/lib/mapbox-driving-route";
import type { MapboxRouteProfile } from "@/lib/mapbox-route-profile";
import { RouteProfileToggle } from "@/components/RouteProfileToggle";
import ItineraireLiveMap from "@/components/preparer/ItineraireLiveMap";
import { slugifyCityId } from "@/lib/preparer-city-pool";

type Row = { id: string; query: string; nom?: string; lat?: number; lng?: number; error?: string };

function newRow(): Row {
  return { id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, query: "" };
}

function SortableRow({
  row,
  onQuery,
  onRemove,
  onGeocode,
  busy,
}: {
  row: Row;
  onQuery: (id: string, q: string) => void;
  onRemove: (id: string) => void;
  onGeocode: (id: string) => void;
  busy: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
  } as React.CSSProperties;

  const ok = row.nom && row.lat != null && row.lng != null;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="viago-glass-card flex items-center gap-2 px-3 py-2.5"
    >
      <button
        type="button"
        className="touch-none text-[var(--color-text-secondary)]"
        aria-label="Glisser"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <input
          type="text"
          value={row.query}
          onChange={(e) => onQuery(row.id, e.target.value)}
          onBlur={() => onGeocode(row.id)}
          placeholder="Ville ou lieu"
          className="w-full border-0 bg-transparent font-courier text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-secondary)]/50"
        />
        {row.error && (
          <p className="mt-0.5 font-courier text-[10px] text-amber-300/90">{row.error}</p>
        )}
      </div>
      {ok && (
        <span className="shrink-0 text-emerald-400/90" title={row.nom} aria-label={row.nom}>
          <MapPin className="h-4 w-4" aria-hidden />
        </span>
      )}
      <button
        type="button"
        onClick={() => onGeocode(row.id)}
        disabled={busy || !row.query.trim()}
        className="shrink-0 rounded-lg border border-[var(--color-glass-border)] px-2 py-1 font-courier text-[10px] font-bold uppercase text-[var(--color-accent-start)] disabled:opacity-40"
      >
        {busy ? "…" : "OK"}
      </button>
      <button
        type="button"
        onClick={() => onRemove(row.id)}
        className="shrink-0 rounded-lg p-1.5 text-white/30 hover:text-red-300"
        aria-label="Supprimer"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function CreateMesVilles() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => [newRow(), newRow()]);
  const [geocodeId, setGeocodeId] = useState<string | null>(null);
  const [dateModal, setDateModal] = useState(false);
  const [dateDebut, setDateDebut] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [routePreview, setRoutePreview] = useState<{
    geometry: { type: "LineString"; coordinates: [number, number][] } | null;
    totalKm: number;
    totalMin: number;
  } | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeProfile, setRouteProfile] = useState<MapboxRouteProfile>(() => {
    if (typeof window === "undefined") return "driving";
    return localStorage.getItem("viago_route_profile") === "cycling" ? "cycling" : "driving";
  });
  const routeReq = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem("viago_route_profile", routeProfile);
    } catch {
      /* ignore */
    }
  }, [routeProfile]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const liveSteps = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            r.nom &&
            r.lat != null &&
            r.lng != null &&
            Number.isFinite(r.lat) &&
            Number.isFinite(r.lng)
        )
        .map((r) => ({
          id: r.id,
          nom: r.nom ?? "",
          type: "nuit" as const,
          lat: r.lat!,
          lng: r.lng!,
        })),
    [rows]
  );

  useEffect(() => {
    const wps = liveSteps.map((s) => ({ lat: s.lat, lng: s.lng }));
    if (wps.length < 2) {
      setRoutePreview(null);
      setRouteBusy(false);
      return;
    }
    const my = ++routeReq.current;
    setRouteBusy(true);
    const t = setTimeout(() => {
      void fetchVoyageRoute(wps, {
        profile: routeProfile,
        excludeMotorway: routeProfile === "driving",
      }).then((r) => {
        if (my !== routeReq.current) return;
        setRouteBusy(false);
        if (!r) {
          setRoutePreview(null);
          return;
        }
        setRoutePreview({
          geometry: r.geometry,
          totalKm: r.distanceKm,
          totalMin: r.durationMin,
        });
      });
    }, 450);
    return () => {
      clearTimeout(t);
    };
  }, [liveSteps, routeProfile]);

  const onQuery = useCallback((id: string, q: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, query: q, error: undefined } : r)));
  }, []);

  const onRemove = useCallback((id: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);

  const onGeocode = useCallback(
    async (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (!row?.query.trim()) return;
      setGeocodeId(id);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(row.query.trim())}`);
        if (!res.ok) {
          setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, error: "Introuvable — précise le nom." } : r))
          );
          return;
        }
        const data = (await res.json()) as { lat?: number; lng?: number; name?: string };
        if (typeof data.lat !== "number" || typeof data.lng !== "number") {
          setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, error: "Coordonnées invalides." } : r))
          );
          return;
        }
        setRows((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  nom: data.name || row.query.trim(),
                  query: data.name || row.query.trim(),
                  lat: data.lat,
                  lng: data.lng,
                  error: undefined,
                }
              : r
          )
        );
      } finally {
        setGeocodeId(null);
      }
    },
    [rows]
  );

  const onDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const a = prev.findIndex((r) => r.id === String(active.id));
      const b = prev.findIndex((r) => r.id === String(over.id));
      if (a < 0 || b < 0) return prev;
      return arrayMove(prev, a, b);
    });
  }, []);

  const openDateThenSave = useCallback(() => {
    const resolved = rows.filter((r) => r.lat != null && r.lng != null && r.nom);
    if (resolved.length === 0) return;
    setDateModal(true);
  }, [rows]);

  const confirmCreate = useCallback(async () => {
    const resolved = rows.filter((r) => r.lat != null && r.lng != null && r.nom);
    if (resolved.length === 0) return;
    setSaving(true);
    try {
      const wps = resolved.map((r) => ({ lat: r.lat!, lng: r.lng! }));
      const route =
        wps.length >= 2
          ? await fetchVoyageRouteForSave(wps, {
              profile: routeProfile,
              excludeMotorway: routeProfile === "driving",
            })
          : null;
      const voyageId = `created-${Date.now()}`;
      const start = new Date(dateDebut);
      const startStr = start.toISOString().split("T")[0];
      const steps = resolved.map((r, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return {
          id: slugifyCityId(r.nom ?? "ville", i),
          nom: r.nom!,
          type: "nuit" as const,
          lat: r.lat!,
          lng: r.lng!,
          date_prevue: d.toISOString().split("T")[0],
          nights: 1,
          budgetNourriture: 0,
          budgetCulture: 0,
          budgetLogement: 0,
        };
      });
      const titre = resolved.length <= 2 ? resolved.map((r) => r.nom).join(" → ") : "Mon road-trip";
      try {
        saveCreatedVoyage({
          id: voyageId,
          titre,
          sousTitre: `${resolved.length} étape${resolved.length > 1 ? "s" : ""} · ébauche`,
          createdAt: new Date().toISOString(),
          dateDebut: startStr,
          routeProfile,
          steps,
          routeGeometry: route?.geometry ?? null,
          stats: route ? { totalKm: route.distanceKm, totalMin: route.durationMin } : undefined,
          legs: route?.legs,
        });
      } catch {
        /* quota / mode privé — on tente quand même la navigation */
      }
      router.push(`/mon-espace/voyage/${voyageId}`);
    } finally {
      setSaving(false);
      setDateModal(false);
    }
  }, [rows, dateDebut, router, routeProfile]);

  return (
    <main className="flex h-full flex-col bg-gradient-to-b from-[var(--color-bg-main)] to-[var(--color-bg-gradient-end)]">
      <div className="pb-bottom-nav min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <p className="font-courier text-[10px] font-bold uppercase tracking-[0.45em] text-[var(--color-accent-start)]">
          Tes lieux
        </p>
        <h1 className="mt-2 font-title text-2xl font-bold leading-tight text-[var(--color-text-primary)]">
          Dans l’ordre qui te va
        </h1>
        <p className="mt-2 font-courier text-sm text-[var(--color-text-secondary)]">
          Saisis chaque ville puis valide. On tracera la route sur la route (pas à vol
          d’oiseau). Ensuite, une seule date : le jour du départ.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="font-courier text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
            Itinéraire
          </span>
          <RouteProfileToggle value={routeProfile} onChange={setRouteProfile} />
        </div>

        <div className="mt-2 h-[min(280px,40vh)] min-h-[200px] w-full">
          <ItineraireLiveMap
            className="h-full w-full"
            steps={liveSteps}
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            routeLine={routePreview?.geometry ?? null}
            routeSummary={
              routePreview && !routeBusy && routePreview.totalKm > 0
                ? { totalKm: routePreview.totalKm, totalMin: routePreview.totalMin }
                : null
            }
          />
        </div>
        {routeBusy && liveSteps.length >= 2 && (
          <p className="mt-1 text-center font-courier text-[10px] text-[var(--color-text-secondary)]">
            Calcul de l’itinéraire…
          </p>
        )}

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-courier text-xs font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
              Étapes
            </h2>
            <button
              type="button"
              onClick={() => setRows((r) => [...r, newRow()])}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-glass-border)] px-3 py-1 font-courier text-[10px] font-bold text-[var(--color-accent-start)]"
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {rows.map((row) => (
                  <li key={row.id}>
                    <SortableRow
                      row={row}
                      onQuery={onQuery}
                      onRemove={onRemove}
                      onGeocode={onGeocode}
                      busy={geocodeId === row.id}
                    />
                  </li>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>

        <button
          type="button"
          onClick={openDateThenSave}
          className="viago-cta-primary mt-8"
        >
          <Sparkles className="h-4 w-4" />
          Générer l’ébauche
        </button>
      </div>

      {dateModal && (
        <div
          className="fixed inset-0 z-[220] flex items-end justify-center bg-black/65 px-4 sm:items-center"
          style={{
            paddingBottom: "max(1rem, calc(6.5rem + env(safe-area-inset-bottom, 0px)))",
            paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
          }}
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Fermer"
            onClick={() => setDateModal(false)}
          />
          <div className="pointer-events-auto relative z-[2] w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#1a1410] p-5 pb-bottom-nav shadow-2xl sm:pb-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-title text-lg font-bold text-white">Date de départ</h3>
                <p className="mt-1 font-courier text-[11px] text-white/50">
                  Les nuits s’enchaînent à partir de ce jour.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDateModal(false)}
                className="rounded-lg p-1 text-white/50 hover:bg-white/5"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="block">
              <span className="mb-1 block font-courier text-[10px] font-bold uppercase text-white/40">
                Premier jour
              </span>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 font-courier text-sm text-white"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDateModal(false)}
                className="flex-1 rounded-xl border border-white/15 py-2.5 font-courier text-xs text-white/70"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void confirmCreate()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-end)] py-2.5 font-courier text-xs font-bold text-white disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Créer dans mon espace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
