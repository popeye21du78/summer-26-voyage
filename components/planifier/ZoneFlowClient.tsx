"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTerritoryById } from "@/lib/editorial-territories";
import { PLANIFIER_REGIONS } from "@/lib/planifier-regions";
import { loadTripDraft, mergeTerritoryIntoDraft, saveTripDraft } from "@/lib/planifier-draft";
import { listFavorites } from "@/lib/planifier-favorites";
import { structureToPlanningPayload } from "@/lib/planifier-structure-to-steps";
import type { StructureOption } from "@/lib/trip-engine/types";

const PRIOS = [
  { id: "villages", label: "Villages" },
  { id: "patrimoine", label: "Patrimoine" },
  { id: "plages", label: "Plages" },
  { id: "nature", label: "Nature" },
  { id: "randos", label: "Randos" },
  { id: "villes", label: "Villes" },
];

export default function ZoneFlowClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [step, setStep] = useState(1);
  const [regionKey, setRegionKey] = useState(PLANIFIER_REGIONS[0]?.key ?? "nouvelle-aquitaine");
  const [searchQuery, setSearchQuery] = useState("");
  const [days, setDays] = useState(7);
  const [pace, setPace] = useState<"tranquille" | "equilibre" | "soutenu">("equilibre");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [notoriety, setNotoriety] = useState<"iconique" | "equilibre" | "moins_connu">("equilibre");
  const [conflictPriority, setConflictPriority] = useState<
    "densite" | "confort" | "ambiance" | "lieux_imposes"
  >("confort");
  const [tripForm, setTripForm] = useState<
    "base_fixe" | "multi_bases" | "mobile" | "options"
  >("options");
  const [territoryId, setTerritoryId] = useState<string | undefined>();
  const [structures, setStructures] = useState<StructureOption[]>([]);
  const [picked, setPicked] = useState<StructureOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const persist = useCallback(() => {
    saveTripDraft({
      mode: "zone",
      updatedAt: new Date().toISOString(),
      fromTerritoryId: territoryId,
      zone: {
        regionKey,
        regionLabel:
          PLANIFIER_REGIONS.find((r) => r.key === regionKey)?.label ?? regionKey,
        searchQuery,
        days,
        pace,
        priorities,
        notoriety,
        tripForm,
        conflictPriority,
      },
    });
  }, [
    territoryId,
    regionKey,
    searchQuery,
    days,
    pace,
    priorities,
    notoriety,
    tripForm,
    conflictPriority,
  ]);

  useEffect(() => {
    const t = sp.get("territoire");
    if (t) {
      const terr = getTerritoryById(t);
      if (terr) {
        setTerritoryId(terr.id);
        setRegionKey(terr.region_key);
        mergeTerritoryIntoDraft(terr.id, terr.region_key, terr.name);
      }
    }
    const d = loadTripDraft();
    if (d?.mode === "zone" && d.zone) {
      setRegionKey(d.zone.regionKey);
      setSearchQuery(d.zone.searchQuery ?? "");
      setDays(d.zone.days);
      setPace(d.zone.pace);
      setPriorities(d.zone.priorities ?? []);
      setNotoriety(d.zone.notoriety);
      setTripForm(d.zone.tripForm);
      if (d.zone.conflictPriority) setConflictPriority(d.zone.conflictPriority);
      if (d.fromTerritoryId) setTerritoryId(d.fromTerritoryId);
    }
  }, [sp]);

  function togglePrio(id: string) {
    setPriorities((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function fetchStructures() {
    setLoading(true);
    try {
      const res = await fetch("/api/trip-planning/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "zone",
          days,
          pace,
          tripForm,
          notoriety,
          priorities,
          conflictPriority,
          regionKey,
          territoryId,
        }),
      });
      const j = await res.json();
      if (j.ok && Array.isArray(j.structures)) {
        setStructures(j.structures);
        setStep(4);
      }
    } finally {
      setLoading(false);
    }
  }

  async function openInPlanning(structure: StructureOption) {
    setApplyError(null);
    const steps = structureToPlanningPayload(structure);
    const res = await fetch("/api/trip-planning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steps }),
    });
    const j = await res.json();
    if (j.ok) router.push("/planning");
    else setApplyError(j.error ?? "Échec de la sauvegarde");
  }

  const favTerritories = listFavorites().filter((f) => f.kind === "territory");

  return (
    <main className="page-under-header mx-auto max-w-lg px-4 py-10">
      <Link
        href="/planifier/commencer"
        className="mb-6 inline-flex items-center gap-1 font-courier text-sm font-bold text-[#A55734] hover:text-[#8b4728]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Accueil
      </Link>

      <h1 className="font-courier text-2xl font-bold text-[#333]">Zone</h1>
      <p className="mt-1 font-courier text-sm text-[#333]/80">
        Étape {step} / 5 — espace de voyage puis structure de nuits.
      </p>

      {favTerritories.length > 0 && step === 1 && (
        <div className="mt-4 rounded-xl border border-[#E07856]/30 bg-[#FFF2EB]/50 p-3">
          <p className="font-courier text-xs font-bold text-[#A55734]">Coups de cœur territoires</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {favTerritories.slice(0, 6).map((f) => {
              const terr = getTerritoryById(f.refId);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    if (terr) {
                      setTerritoryId(terr.id);
                      setRegionKey(terr.region_key);
                    }
                  }}
                  className="rounded-full border border-[#A55734]/30 bg-white px-2 py-1 font-courier text-xs"
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-6 space-y-4 font-courier text-sm">
          <label className="block">
            <span className="font-bold text-[#A55734]">Région</span>
            <select
              value={regionKey}
              onChange={(e) => setRegionKey(e.target.value)}
              className="mt-1 w-full rounded-lg border-2 border-[#A55734]/25 bg-white px-3 py-2"
            >
              {PLANIFIER_REGIONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-bold text-[#A55734]">Recherche (optionnel)</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex. Lubéron, Pays basque…"
              className="mt-1 w-full rounded-lg border-2 border-[#A55734]/25 px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              persist();
              setStep(2);
            }}
            className="w-full rounded-full bg-[#E07856] py-2.5 font-bold text-white"
          >
            Continuer
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-4 font-courier text-sm">
          <label className="block">
            <span className="font-bold text-[#A55734]">Nombre de jours</span>
            <input
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border-2 border-[#A55734]/25 px-3 py-2"
            />
          </label>
          <div>
            <span className="font-bold text-[#A55734]">Rythme</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["tranquille", "Tranquille"],
                  ["equilibre", "Équilibré"],
                  ["soutenu", "Soutenu"],
                ] as const
              ).map(([v, lab]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPace(v)}
                  className={`rounded-full border-2 px-3 py-1 text-xs font-bold ${
                    pace === v ? "border-[#E07856] bg-[#E07856] text-white" : "border-[#A55734]/25"
                  }`}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="font-bold text-[#A55734]">Priorités</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRIOS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePrio(p.id)}
                  className={`rounded-full border-2 px-3 py-1 text-xs font-bold ${
                    priorities.includes(p.id)
                      ? "border-[#E07856] bg-[#FFF2EB]"
                      : "border-[#A55734]/25"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="font-bold text-[#A55734]">Notoriété</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["iconique", "Incontournables"],
                  ["equilibre", "Équilibré"],
                  ["moins_connu", "Moins connu"],
                ] as const
              ).map(([v, lab]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setNotoriety(v)}
                  className={`rounded-full border-2 px-3 py-1 text-xs font-bold ${
                    notoriety === v ? "border-[#E07856] bg-[#E07856] text-white" : "border-[#A55734]/25"
                  }`}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="font-bold text-[#A55734]">Si contradiction (route vs contenu)</span>
            <div className="mt-2 flex flex-col gap-2">
              {(
                [
                  ["confort", "Priorité confort / moins de route"],
                  ["densite", "Priorité densité de visites"],
                  ["ambiance", "Priorité ambiance"],
                  ["lieux_imposes", "Priorité lieux imposés"],
                ] as const
              ).map(([v, lab]) => (
                <label key={v} className="flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name="conflict"
                    checked={conflictPriority === v}
                    onChange={() => setConflictPriority(v)}
                  />
                  {lab}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-full border-2 border-[#A55734]/30 py-2 font-bold"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={() => {
                persist();
                setStep(3);
              }}
              className="flex-1 rounded-full bg-[#E07856] py-2 font-bold text-white"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 space-y-3 font-courier text-sm">
          <span className="font-bold text-[#A55734]">Forme du voyage</span>
          {(
            [
              ["base_fixe", "Rester basé dans un seul endroit"],
              ["multi_bases", "Avoir 2 à 3 bases"],
              ["mobile", "Itinéraire plus mobile"],
              ["options", "Me montrer plusieurs options"],
            ] as const
          ).map(([v, lab]) => (
            <button
              key={v}
              type="button"
              onClick={() => setTripForm(v)}
              className={`block w-full rounded-xl border-2 p-3 text-left ${
                tripForm === v ? "border-[#E07856] bg-[#FFF2EB]" : "border-[#A55734]/20"
              }`}
            >
              {lab}
            </button>
          ))}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-full border-2 border-[#A55734]/30 py-2 font-bold"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                persist();
                void fetchStructures();
              }}
              className="flex-1 rounded-full bg-[#E07856] py-2 font-bold text-white disabled:opacity-60"
            >
              {loading ? "…" : "Proposer des structures"}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mt-6 space-y-4 font-courier text-sm">
          {structures.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setPicked(s);
                setStep(5);
              }}
              className="block w-full rounded-xl border-2 border-[#A55734]/25 p-4 text-left hover:border-[#E07856]"
            >
              <span className="font-bold text-[#A55734]">{s.label}</span>
              <p className="mt-1 text-xs text-[#333]/80">{s.mobility}</p>
              <p className="mt-2 text-xs">
                {s.bases.map((b) => `${b.name} (${b.nights} n.)`).join(" → ")}
              </p>
            </button>
          ))}
          <button type="button" onClick={() => setStep(3)} className="text-xs underline">
            Retour
          </button>
        </div>
      )}

      {step === 5 && picked && (
        <div className="mt-6 space-y-4 font-courier text-sm">
          <h2 className="font-bold text-[#A55734]">{picked.label}</h2>
          <ul className="list-inside list-disc text-xs text-[#333]/85">
            {picked.explanations.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <div>
            <span className="font-bold text-[#A55734]">Enrichissements (aperçu)</span>
            {(picked.enrichments ?? []).map((seg) => (
              <div key={seg.segmentIndex} className="mt-2 rounded-lg bg-[#FFF2EB]/60 p-2 text-xs">
                <p className="font-bold">{seg.label}</p>
                <ul className="mt-1 list-inside list-disc">
                  {seg.pois.map((p, i) => (
                    <li key={i}>
                      {p.name} — {p.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {applyError && <p className="text-xs text-red-600">{applyError}</p>}
          <button
            type="button"
            onClick={() => openInPlanning(picked)}
            className="w-full rounded-full bg-[#E07856] py-3 font-bold text-white"
          >
            Ouvrir dans le planning
          </button>
          <button type="button" onClick={() => setStep(4)} className="block w-full text-xs underline">
            Choisir une autre structure
          </button>
        </div>
      )}
    </main>
  );
}
