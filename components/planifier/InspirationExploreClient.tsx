"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { FeatureCollection } from "geojson";
import {
  AMBIANCE_OPTIONS,
  DURATION_OPTIONS,
  filterTerritoriesByInspiration,
  listTerritories,
  type InspirationAmbianceFilter,
  type InspirationDurationFilter,
  type TerritoriesFeatureCollection,
} from "@/lib/editorial-territories";
import { addFavorite } from "@/lib/planifier-favorites";
import InspirationMapClient from "./InspirationMapClient";

const MAP_REGIONS_GEO_URL = "/geo/inspiration-map-regions.geojson";
const MAP_REGIONS_OUTLINE_URL = "/geo/inspiration-map-regions-outline.geojson";

type Props = { mapboxAccessToken: string | undefined };

export default function InspirationExploreClient({ mapboxAccessToken }: Props) {
  const all = useMemo(() => listTerritories(), []);
  const [ambiance, setAmbiance] = useState<InspirationAmbianceFilter[]>([]);
  const [duration, setDuration] = useState<InspirationDurationFilter | null>(null);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sectorsFc, setSectorsFc] = useState<TerritoriesFeatureCollection | null>(null);
  const [outlineFc, setOutlineFc] = useState<FeatureCollection | null>(null);
  const [sectorLabels, setSectorLabels] = useState<Map<string, string>>(new Map());
  const [sectorsLoadState, setSectorsLoadState] = useState<"idle" | "loading" | "error">(
    "idle"
  );

  useEffect(() => {
    let cancelled = false;
    setSectorsLoadState("loading");
    Promise.all([
      fetch(MAP_REGIONS_GEO_URL, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<TerritoriesFeatureCollection>;
      }),
      fetch(MAP_REGIONS_OUTLINE_URL, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<FeatureCollection>) : null))
        .catch(() => null),
    ])
      .then(([data, outline]) => {
        if (cancelled) return;
        setSectorsFc(data);
        setOutlineFc(outline ?? null);
        const m = new Map<string, string>();
        for (const f of data.features) {
          const id = f.properties?.id;
          const name = f.properties?.name;
          if (typeof id === "string" && typeof name === "string") m.set(id, name);
        }
        setSectorLabels(m);
        setSectorsLoadState("idle");
      })
      .catch(() => {
        if (!cancelled) setSectorsLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => filterTerritoriesByInspiration(all, ambiance, duration, selectedSectorId),
    [all, ambiance, duration, selectedSectorId]
  );

  const selected = selectedId ? all.find((t) => t.id === selectedId) : null;
  const selectedSectorLabel = selectedSectorId
    ? sectorLabels.get(selectedSectorId) ?? selectedSectorId
    : null;

  function toggleAmbiance(id: InspirationAmbianceFilter) {
    setAmbiance((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function heartTerritory(status: "inspiration" | "soft" | "hard") {
    if (!selected) return;
    addFavorite({
      kind: "territory",
      status,
      label: selected.name,
      refId: selected.id,
      meta: {
        region_key: selected.region_key,
        poi_sector_id: selected.poi_sector_id,
      },
    });
  }

  function onMapSelectSector(id: string) {
    setSelectedSectorId(id);
    setSelectedId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <span className="w-full font-courier text-xs font-bold uppercase text-[#A55734] sm:w-auto sm:py-1">
          Ambiances
        </span>
        {AMBIANCE_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => toggleAmbiance(o.id)}
            className={`rounded-full border-2 px-3 py-1 font-courier text-xs font-bold transition ${
              ambiance.includes(o.id)
                ? "border-[#E07856] bg-[#E07856] text-white"
                : "border-[#E07856]/35 bg-white text-[#333]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-courier text-xs font-bold uppercase text-[#A55734]">Durée</span>
        <select
          value={duration ?? ""}
          onChange={(e) =>
            setDuration((e.target.value || null) as InspirationDurationFilter | null)
          }
          className="rounded-lg border-2 border-[#A55734]/25 bg-white px-3 py-2 font-courier text-sm text-[#333]"
        >
          <option value="">Toutes</option>
          {DURATION_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <p className="font-courier text-xs leading-relaxed text-[#333]/75">
        Carte : fond sobre (sans routes ni villes), aplats discrets et contours régionaux colorés. Clique une
        zone pour filtrer la liste et ouvrir le détail.
      </p>

      {selectedSectorLabel && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#E07856]/50 bg-[#FFF2EB] px-3 py-1 font-courier text-xs font-bold text-[#A55734]">
            Secteur : {selectedSectorLabel}
          </span>
          <button
            type="button"
            onClick={() => setSelectedSectorId(null)}
            className="font-courier text-xs font-bold text-[#333]/70 underline decoration-[#A55734]/40 hover:text-[#A55734]"
          >
            Toute la France
          </button>
        </div>
      )}

      {mapboxAccessToken ? (
        <InspirationMapClient
          data={sectorsFc}
          outlineData={outlineFc}
          mapboxAccessToken={mapboxAccessToken}
          selectedId={selectedSectorId}
          onSelectTerritory={onMapSelectSector}
          loading={sectorsLoadState === "loading"}
          loadError={sectorsLoadState === "error"}
        />
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 font-courier text-sm text-[#333]">
          Configure <code className="rounded bg-white px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> pour la
          carte. Tu peux quand même sélectionner un territoire dans la liste ci-dessous.
        </p>
      )}

      <div
        id="liste-territoires-inspiration"
        className="grid scroll-mt-24 gap-3 sm:grid-cols-2"
      >
        {filtered.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setSelectedId(t.id);
              setSelectedSectorId(t.poi_sector_id);
            }}
            className={`rounded-xl border-2 p-4 text-left font-courier transition ${
              selectedId === t.id
                ? "border-[#E07856] bg-[#FFF2EB]"
                : "border-[#A55734]/20 bg-white hover:border-[#E07856]/50"
            }`}
          >
            <span className="font-bold text-[#A55734]">{t.name}</span>
            <p className="mt-1 text-xs leading-relaxed text-[#333]/85">{t.pitch}</p>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="rounded-lg border border-[#A55734]/20 bg-white p-4 font-courier text-sm text-[#333]/85">
          Aucun territoire ne correspond à ces critères. Essaie d’enlever un filtre d’ambiance, la
          durée, ou la région sélectionnée sur la carte.
        </p>
      )}

      {selected && (
        <aside className="rounded-2xl border-2 border-[#E07856]/40 bg-white/95 p-5 shadow-md">
          <h2 className="font-courier text-lg font-bold text-[#A55734]">{selected.name}</h2>
          <p className="mt-2 font-courier text-sm leading-relaxed text-[#333]">
            {selected.pitch}
          </p>
          <ul className="mt-3 space-y-1 font-courier text-xs text-[#333]/85">
            {selected.markers.map((m) => (
              <li key={m}>· {m}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="w-full font-courier text-xs font-bold text-[#A55734]">
              Coup de cœur — statut
            </span>
            <button
              type="button"
              onClick={() => heartTerritory("inspiration")}
              className="inline-flex items-center gap-1 rounded-full border border-[#A55734]/30 px-3 py-1.5 font-courier text-xs font-bold text-[#333] hover:bg-[#FFF2EB]"
            >
              <Heart className="h-3.5 w-3.5" /> Inspiration
            </button>
            <button
              type="button"
              onClick={() => heartTerritory("soft")}
              className="inline-flex items-center gap-1 rounded-full border border-[#A55734]/30 px-3 py-1.5 font-courier text-xs font-bold text-[#333] hover:bg-[#FFF2EB]"
            >
              <Heart className="h-3.5 w-3.5" /> Si possible
            </button>
            <button
              type="button"
              onClick={() => heartTerritory("hard")}
              className="inline-flex items-center gap-1 rounded-full border border-[#A55734]/30 px-3 py-1.5 font-courier text-xs font-bold text-[#333] hover:bg-[#FFF2EB]"
            >
              <Heart className="h-3.5 w-3.5" /> Indispensable
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/planifier/inspiration/${selected.id}`}
              className="rounded-full border-2 border-[#E07856] bg-gradient-to-r from-[#E07856] to-[#D4635B] px-4 py-2 font-courier text-sm font-bold text-white shadow-md transition hover:opacity-95"
            >
              Fiche territoire
            </Link>
            <Link
              href={`/planifier/zone?territoire=${encodeURIComponent(selected.id)}`}
              className="rounded-full border-2 border-[#A55734]/40 px-4 py-2 font-courier text-sm font-bold text-[#A55734] transition hover:bg-[#FFF2EB]"
            >
              Créer un voyage ici
            </Link>
          </div>
        </aside>
      )}
    </div>
  );
}
