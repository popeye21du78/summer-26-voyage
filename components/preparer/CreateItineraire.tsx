"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Moon, Eye, Plus, Trash2, ArrowUp, ArrowDown, Sparkles,
  Calendar, Gauge, MapPin,
} from "lucide-react";
import { loadTripDraft, clearTripDraft } from "@/lib/planifier-draft";
import { saveCreatedVoyage } from "@/lib/created-voyages";
import { getCityPoolForDraft, slugifyCityId } from "@/lib/preparer-city-pool";

type StepType = "nuit" | "passage";

type GeneratedStep = {
  id: string;
  nom: string;
  type: StepType;
  lat: number;
  lng: number;
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
  return pool.slice(0, count).map((c, i) => ({
    id: slugifyCityId(c.name, i),
    nom: c.name,
    lat: c.lat,
    lng: c.lng,
    type: i % 3 === 2 ? ("passage" as const) : ("nuit" as const),
  }));
}

const RYTHME_LABELS: Record<string, string> = {
  tranquille: "Tranquille",
  equilibre: "Equilibre",
  soutenu: "Dense",
};

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

export default function CreateItineraire() {
  const router = useRouter();
  const [steps, setSteps] = useState<GeneratedStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [cadrage, setCadrage] = useState<CadrageData>({});
  const [regionLabel, setRegionLabel] = useState("Mon voyage");

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
      prev.map((s) =>
        s.id === id ? { ...s, type: s.type === "nuit" ? "passage" : "nuit" } : s
      )
    );
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const moveStep = useCallback((id: string, dir: -1 | 1) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => {
      const draft = loadTripDraft();
      const pool = getCityPoolForDraft(draft?.zone?.regionKey, draft?.fromTerritoryId);
      const used = new Set(prev.map((p) => p.nom));
      const nextCity = pool.find((c) => !used.has(c.name));
      if (!nextCity) {
        const fallback = getCityPoolForDraft(undefined, undefined);
        const extra = fallback.find((c) => !used.has(c.name));
        if (!extra) return prev;
        return [
          ...prev,
          {
            id: slugifyCityId(extra.name, prev.length),
            nom: extra.name,
            lat: extra.lat,
            lng: extra.lng,
            type: "passage" as const,
          },
        ];
      }
      return [
        ...prev,
        {
          id: slugifyCityId(nextCity.name, prev.length),
          nom: nextCity.name,
          lat: nextCity.lat,
          lng: nextCity.lng,
          type: "passage" as const,
        },
      ];
    });
  }, []);

  const nuits = useMemo(() => steps.filter((s) => s.type === "nuit").length, [steps]);
  const passages = useMemo(() => steps.filter((s) => s.type === "passage").length, [steps]);

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

    saveCreatedVoyage({
      id: voyageId,
      titre: label,
      sousTitre: `${withIntermediates.length} étapes · ${rhythmLabel}`,
      createdAt: new Date().toISOString(),
      steps: withIntermediates.map((s, i) => ({
        id: s.id,
        nom: s.nom,
        type: s.type,
        lat: s.lat,
        lng: s.lng,
        date_prevue: new Date(startDate.getTime() + i * 86400000)
          .toISOString()
          .split("T")[0],
      })),
    });

    clearTripDraft();
    if (typeof window !== "undefined") {
      localStorage.removeItem("preparer-cadrage");
    }
    router.push("/preparer/itineraire?done=1");
  }

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center bg-gradient-to-b from-[#2a1810] to-[#1a120d]">
        <p className="voyage-loading-text text-sm uppercase tracking-widest">
          voyage voyage…
        </p>
      </main>
    );
  }

  return (
    <main className="flex h-full flex-col bg-gradient-to-b from-[#2a1810] to-[#1a120d]">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        {/* Recap header */}
        <p className="font-courier text-[10px] font-bold uppercase tracking-[0.45em] text-[#E07856]">
          Récapitulatif
        </p>
        <h1 className="mt-2 font-courier text-2xl font-bold leading-tight text-white">
          {regionLabel}
        </h1>

        <div className="mt-5 space-y-3">
          {/* Dates */}
          {cadrage.dateDebut && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <Calendar className="h-4 w-4 shrink-0 text-[#E07856]" />
              <div className="font-courier text-sm text-white/75">
                {formatDate(cadrage.dateDebut)}
                {cadrage.dateFin && ` → ${formatDate(cadrage.dateFin)}`}
                {cadrage.days && (
                  <span className="ml-2 text-white/40">
                    · {cadrage.days} jour{cadrage.days > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Rythme */}
          {cadrage.rythme && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <Gauge className="h-4 w-4 shrink-0 text-[#E07856]" />
              <span className="font-courier text-sm text-white/75">
                Rythme {RYTHME_LABELS[cadrage.rythme] ?? cadrage.rythme}
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <MapPin className="h-4 w-4 shrink-0 text-[#E07856]" />
            <span className="font-courier text-sm text-white/75">
              {steps.length} étapes · {nuits} nuit{nuits > 1 ? "s" : ""} · {passages} passage{passages > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Steps list */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-courier text-sm font-bold uppercase tracking-wider text-[#E07856]">
              Étapes
            </h2>
            <button
              onClick={addStep}
              className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 font-courier text-[10px] font-bold text-[#E07856] transition hover:border-[#E07856]/40"
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </button>
          </div>

          <div className="space-y-2">
            {steps.map((step, i) => (
              <div
                key={step.id}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E07856]/15 font-courier text-[10px] font-bold text-[#E07856]">
                  {i + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-courier text-sm font-bold text-white/85">
                    {step.nom}
                  </p>
                </div>

                <button
                  onClick={() => toggleType(step.id)}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-courier text-[10px] font-bold transition ${
                    step.type === "nuit"
                      ? "bg-white/10 text-white/60"
                      : "bg-[#E07856]/15 text-[#E07856]"
                  }`}
                >
                  {step.type === "nuit" ? (
                    <Moon className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  {step.type === "nuit" ? "Nuit" : "Passage"}
                </button>

                <button
                  onClick={() => moveStep(step.id, -1)}
                  disabled={i === 0}
                  className="text-white/25 transition hover:text-white/50 disabled:opacity-20"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveStep(step.id, 1)}
                  disabled={i === steps.length - 1}
                  className="text-white/25 transition hover:text-white/50 disabled:opacity-20"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>

                <button
                  onClick={() => removeStep(step.id)}
                  className="text-red-400/30 transition hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <p className="mt-3 font-courier text-[10px] text-white/30">
            Des villes intermédiaires seront ajoutées automatiquement entre les étapes éloignées.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleCreate}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E07856] to-[#c94a4a] py-4 font-courier text-sm font-bold text-white shadow-[0_10px_36px_rgba(224,120,86,0.45)] transition hover:brightness-105 active:scale-[0.99]"
        >
          <Sparkles className="h-4 w-4" />
          Créer ce voyage
        </button>
      </div>
    </main>
  );
}
