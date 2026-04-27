"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, GripVertical, MapPin, Plus, Sparkles, Trash2 } from "lucide-react";
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
import {
  saveCreatedVoyage,
  stashLastCreatedVoyageForSession,
  stashNavInflightCreated,
  type CreatedVoyage,
} from "@/lib/created-voyages";
import { setCreatedVoyageHandoff } from "@/lib/voyage-created-handoff";
import {
  encodeCreatedVoyageToHandoffB64,
  buildMonEspaceVoyageHandoffPath,
} from "@/lib/created-voyage-handoff-url";
import { persistCreatedVoyageOnServer } from "@/lib/created-voyage-server-sync";
import { fetchVoyageRoute, fetchVoyageRouteForSave } from "@/lib/mapbox-driving-route";
import type { MapboxRouteProfile } from "@/lib/mapbox-route-profile";
import { RouteProfileToggle } from "@/components/RouteProfileToggle";
import ItineraireLiveMap from "@/components/preparer/ItineraireLiveMap";
import { slugifyCityId } from "@/lib/preparer-city-pool";
import { useWindowDndAutoscroll } from "@/lib/hooks/use-window-dnd-autoscroll";

const MAX_MES_VILLES_ROWS = 30;

type Row = { id: string; query: string; nom?: string; lat?: number; lng?: number; error?: string };

function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return false;
  const t = new Date(s.trim() + "T12:00:00");
  return !Number.isNaN(t.getTime());
}

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
  const dndAutoscroll = useWindowDndAutoscroll();

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

  const resolvedRows = useMemo(
    () => rows.filter((r) => r.lat != null && r.lng != null && r.nom),
    [rows]
  );
  const dateDepartOk = isValidISODate(dateDebut);
  const canCreate = resolvedRows.length > 0 && dateDepartOk;

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

  const confirmCreate = useCallback(async () => {
    const resolved = rows.filter((r) => r.lat != null && r.lng != null && r.nom);
    if (resolved.length === 0) return;
    if (!isValidISODate(dateDebut)) return;
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
      const created: CreatedVoyage = {
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
      };
      setCreatedVoyageHandoff(created);
      stashLastCreatedVoyageForSession(created);
      stashNavInflightCreated(created);
      try {
        saveCreatedVoyage(created);
      } catch {
        /* quota / mode privé — session + handoff en mémoire */
      }
      const serverOk = await persistCreatedVoyageOnServer(created);
      if (serverOk) {
        router.push(`/mon-espace/voyage/${encodeURIComponent(voyageId)}`);
        return;
      }
      const b64 = encodeCreatedVoyageToHandoffB64(created);
      router.push(buildMonEspaceVoyageHandoffPath(voyageId, b64));
    } finally {
      setSaving(false);
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
          Saisis chaque ville puis valide (OK). La <strong className="font-bold text-[var(--color-text-primary)]/90">date de départ</strong> est obligatoire
          (encart ci-dessous) avant de générer l’ébauche dans mon espace.
        </p>

        <div className="viago-glass-card viago-glass-card--accent-border mt-5 p-4">
          <div className="flex items-start gap-3">
            <Calendar
              className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent-start)]"
              strokeWidth={2}
            />
            <div className="min-w-0 flex-1">
              <label className="block">
                <span className="font-title text-sm font-bold text-[var(--color-text-primary)]">
                  Date de départ <span className="text-amber-400/95" aria-hidden>*</span>
                </span>
                <span className="mt-0.5 block font-courier text-[11px] text-[var(--color-text-secondary)]">
                  Toutes les nuits s’enchaînent à partir de ce jour.
                </span>
                <input
                  type="date"
                  required
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  aria-invalid={!dateDepartOk}
                  className="mt-3 w-full max-w-[min(100%,260px)] rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 font-courier text-sm text-white"
                />
              </label>
              {!dateDepartOk && (
                <p className="mt-2 font-courier text-[10px] text-amber-300/90" role="alert">
                  Renseigne une date valide pour débloquer l’ébauche.
                </p>
              )}
            </div>
          </div>
        </div>

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
              onClick={() =>
                setRows((r) =>
                  r.length >= MAX_MES_VILLES_ROWS ? r : [...r, newRow()]
                )
              }
              disabled={rows.length >= MAX_MES_VILLES_ROWS}
              title={
                rows.length >= MAX_MES_VILLES_ROWS
                  ? `Maximum ${MAX_MES_VILLES_ROWS} étapes`
                  : "Ajouter une ligne"
              }
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-glass-border)] px-3 py-1 font-courier text-[10px] font-bold text-[var(--color-accent-start)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </button>
          </div>
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
              onDragEnd(e);
            }}
          >
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
          onClick={() => void confirmCreate()}
          disabled={!canCreate || saving}
          className="viago-cta-primary mt-8 min-h-[48px] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Sparkles className="h-4 w-4" />
          {saving ? "Création…" : "Générer l’ébauche dans mon espace"}
        </button>
        {resolvedRows.length > 0 && !dateDepartOk && (
          <p className="mt-2 font-courier text-[10px] text-amber-300/85" role="status">
            Indique la date de départ (encart en haut) pour valider.
          </p>
        )}
      </div>
    </main>
  );
}
