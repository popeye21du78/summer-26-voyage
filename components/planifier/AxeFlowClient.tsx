"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { loadTripDraft, saveTripDraft } from "@/lib/planifier-draft";
import { structureToPlanningPayload } from "@/lib/planifier-structure-to-steps";
import type { StructureOption } from "@/lib/trip-engine/types";

const PRIOS = [
  { id: "villages", label: "Villages" },
  { id: "plages", label: "Plages" },
  { id: "patrimoine", label: "Patrimoine" },
  { id: "randos", label: "Randos" },
  { id: "nature", label: "Nature" },
  { id: "villes", label: "Villes" },
  { id: "gastronomie", label: "Gastronomie" },
];

const CORRIDORS = [
  { id: "direct", label: "Corridor direct", desc: "Tracé serré entre les deux points." },
  { id: "vallees", label: "Vallées et bastides", desc: "Légèrement plus intérieur, villages." },
  { id: "cotier", label: "Corridor côtier", desc: "Favorise le littoral si pertinent." },
  { id: "panoramique", label: "Corridor panoramique", desc: "Détours de point de vue." },
];

export default function AxeFlowClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [startQ, setStartQ] = useState("Bordeaux");
  const [endQ, setEndQ] = useState("Toulouse");
  const [startLabel, setStartLabel] = useState("Bordeaux");
  const [endLabel, setEndLabel] = useState("Toulouse");
  const [startLat, setStartLat] = useState(44.8378);
  const [startLng, setStartLng] = useState(-0.5792);
  const [endLat, setEndLat] = useState(43.6047);
  const [endLng, setEndLng] = useState(1.4442);
  const [returnToStart, setReturnToStart] = useState(false);
  const [days, setDays] = useState(7);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [corridorTendency, setCorridorTendency] = useState<
    "direct" | "detours_legers" | "grands_detours" | "plusieurs"
  >("detours_legers");
  const [lateral, setLateral] = useState<"littoral" | "interieur" | "relief" | "aucune">("aucune");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [notoriety, setNotoriety] = useState<"iconique" | "equilibre" | "moins_connu">("equilibre");
  const [routeVsDiscovery, setRouteVsDiscovery] = useState<
    "moins_route" | "plus_voir" | "plus_temps" | "ambiance"
  >("plus_voir");
  const [corridorVariant, setCorridorVariant] = useState<string>("direct");
  const [structures, setStructures] = useState<StructureOption[]>([]);
  const [picked, setPicked] = useState<StructureOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const persist = useCallback(() => {
    saveTripDraft({
      mode: "axis",
      updatedAt: new Date().toISOString(),
      axis: {
        startLabel,
        endLabel,
        startLat,
        startLng,
        endLat,
        endLng,
        returnToStart,
        days,
        corridorTendency,
        lateral,
        priorities,
        notoriety,
        routeVsDiscovery,
        corridorVariant,
      },
    });
  }, [
    startLabel,
    endLabel,
    startLat,
    startLng,
    endLat,
    endLng,
    returnToStart,
    days,
    corridorTendency,
    lateral,
    priorities,
    notoriety,
    routeVsDiscovery,
    corridorVariant,
  ]);

  useEffect(() => {
    const d = loadTripDraft();
    if (d?.mode === "axis" && d.axis) {
      const a = d.axis;
      setStartLabel(a.startLabel);
      setEndLabel(a.endLabel);
      setStartLat(a.startLat);
      setStartLng(a.startLng);
      setEndLat(a.endLat);
      setEndLng(a.endLng);
      setReturnToStart(a.returnToStart);
      setDays(a.days);
      setCorridorTendency(a.corridorTendency);
      if (a.lateral) setLateral(a.lateral);
      setPriorities(a.priorities ?? []);
      setNotoriety(a.notoriety);
      if (a.routeVsDiscovery) setRouteVsDiscovery(a.routeVsDiscovery);
      if (a.corridorVariant) setCorridorVariant(a.corridorVariant);
    }
  }, []);

  async function geocodePair() {
    setGeoErr(null);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/geocode?q=${encodeURIComponent(startQ)}`),
        fetch(`/api/geocode?q=${encodeURIComponent(endQ)}`),
      ]);
      const j1 = await r1.json();
      const j2 = await r2.json();
      if (!r1.ok) throw new Error(j1.error ?? "Départ introuvable");
      if (!r2.ok) throw new Error(j2.error ?? "Arrivée introuvable");
      setStartLat(j1.lat);
      setStartLng(j1.lng);
      setStartLabel(j1.name ?? startQ);
      setEndLat(j2.lat);
      setEndLng(j2.lng);
      setEndLabel(j2.name ?? endQ);
      setStep(2);
    } catch (e) {
      setGeoErr(e instanceof Error ? e.message : "Erreur géocodage");
    }
  }

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
          mode: "axis",
          days,
          pace: "equilibre",
          tripForm: "mobile",
          notoriety,
          priorities,
          axis: {
            startLabel,
            endLabel,
            startLat,
            startLng,
            endLat,
            endLng,
            corridorTendency,
            lateral: lateral === "aucune" ? undefined : lateral,
            routeVsDiscovery,
            corridorVariant: CORRIDORS.find((c) => c.id === corridorVariant)?.label ?? corridorVariant,
          },
        }),
      });
      const j = await res.json();
      if (j.ok && Array.isArray(j.structures)) {
        setStructures(j.structures);
        setStep(6);
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
    else setApplyError(j.error ?? "Échec");
  }

  return (
    <main className="page-under-header mx-auto max-w-lg px-4 py-10">
      <Link
        href="/planifier/commencer"
        className="mb-6 inline-flex items-center gap-1 font-courier text-sm font-bold text-[var(--color-accent-end)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Accueil
      </Link>
      <h1 className="font-courier text-2xl font-bold text-[#333]">Départ → arrivée</h1>
      <p className="mt-1 font-courier text-sm text-[#333]/80">Étape {step} / 6</p>

      {step === 1 && (
        <div className="mt-6 space-y-3 font-courier text-sm">
          <label className="block">
            <span className="font-bold text-[var(--color-accent-end)]">Départ</span>
            <input
              value={startQ}
              onChange={(e) => setStartQ(e.target.value)}
              className="mt-1 w-full rounded-lg border-2 border-[var(--color-accent-end)]/25 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="font-bold text-[var(--color-accent-end)]">Arrivée</span>
            <input
              value={endQ}
              onChange={(e) => setEndQ(e.target.value)}
              className="mt-1 w-full rounded-lg border-2 border-[var(--color-accent-end)]/25 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={returnToStart}
              onChange={(e) => setReturnToStart(e.target.checked)}
            />
            Retour au départ (boucle)
          </label>
          <label className="block">
            <span className="font-bold text-[var(--color-accent-end)]">Nombre de jours</span>
            <input
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border-2 border-[var(--color-accent-end)]/25 px-3 py-2"
            />
          </label>
          {geoErr && <p className="text-xs text-red-600">{geoErr}</p>}
          <button
            type="button"
            onClick={() => void geocodePair()}
            className="w-full rounded-full bg-[var(--color-accent-start)] py-2.5 font-bold text-white"
          >
            Valider les lieux
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-4 font-courier text-sm">
          <span className="font-bold text-[var(--color-accent-end)]">Tendance du parcours</span>
          {(
            [
              ["direct", "Le plus direct"],
              ["detours_legers", "Quelques détours intéressants"],
              ["grands_detours", "Ouvert à de vrais détours"],
              ["plusieurs", "Montre-moi plusieurs possibilités"],
            ] as const
          ).map(([v, lab]) => (
            <button
              key={v}
              type="button"
              onClick={() => setCorridorTendency(v)}
              className={`block w-full rounded-xl border-2 p-3 text-left text-xs ${
                corridorTendency === v ? "border-[var(--color-accent-start)] bg-[#FFF2EB]" : "border-[var(--color-accent-end)]/20"
              }`}
            >
              {lab}
            </button>
          ))}
          <span className="font-bold text-[var(--color-accent-end)]">Préférence spatiale</span>
          <select
            value={lateral}
            onChange={(e) => setLateral(e.target.value as typeof lateral)}
            className="w-full rounded-lg border-2 border-[var(--color-accent-end)]/25 px-3 py-2"
          >
            <option value="aucune">Sans préférence</option>
            <option value="littoral">Plutôt littoral</option>
            <option value="interieur">Plutôt intérieur</option>
            <option value="relief">Plutôt relief</option>
          </select>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-full border-2 py-2">
              Retour
            </button>
            <button
              type="button"
              onClick={() => {
                persist();
                setStep(3);
              }}
              className="flex-1 rounded-full bg-[var(--color-accent-start)] py-2 font-bold text-white"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 space-y-4 font-courier text-sm">
          <div className="flex flex-wrap gap-2">
            {PRIOS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePrio(p.id)}
                className={`rounded-full border-2 px-3 py-1 text-xs font-bold ${
                  priorities.includes(p.id) ? "border-[var(--color-accent-start)] bg-[#FFF2EB]" : "border-[var(--color-accent-end)]/25"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className="font-bold text-[var(--color-accent-end)]">Notoriété</span>
          <div className="flex flex-wrap gap-2">
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
                className={`rounded-full border-2 px-3 py-1 text-xs ${
                  notoriety === v ? "border-[var(--color-accent-start)] bg-[var(--color-accent-start)] text-white" : "border-[var(--color-accent-end)]/25"
                }`}
              >
                {lab}
              </button>
            ))}
          </div>
          <span className="font-bold text-[var(--color-accent-end)]">Arbitrage principal</span>
          {(
            [
              ["moins_route", "Limiter la route"],
              ["plus_voir", "Voir plus de choses"],
              ["plus_temps", "Prendre plus le temps"],
              ["ambiance", "Suivre avant tout une ambiance"],
            ] as const
          ).map(([v, lab]) => (
            <label key={v} className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="rvd"
                checked={routeVsDiscovery === v}
                onChange={() => setRouteVsDiscovery(v)}
              />
              {lab}
            </label>
          ))}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-full border-2 py-2">
              Retour
            </button>
            <button
              type="button"
              onClick={() => {
                persist();
                setStep(4);
              }}
              className="flex-1 rounded-full bg-[var(--color-accent-start)] py-2 font-bold text-white"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mt-6 space-y-3 font-courier text-sm">
          <span className="font-bold text-[var(--color-accent-end)]">Corridors plausibles</span>
          {CORRIDORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCorridorVariant(c.id)}
              className={`block w-full rounded-xl border-2 p-3 text-left ${
                corridorVariant === c.id ? "border-[var(--color-accent-start)] bg-[#FFF2EB]" : "border-[var(--color-accent-end)]/20"
              }`}
            >
              <span className="font-bold">{c.label}</span>
              <p className="mt-1 text-xs text-[#333]/80">{c.desc}</p>
            </button>
          ))}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(3)} className="flex-1 rounded-full border-2 py-2">
              Retour
            </button>
            <button
              type="button"
              onClick={() => {
                persist();
                setStep(5);
              }}
              className="flex-1 rounded-full bg-[var(--color-accent-start)] py-2 font-bold text-white"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="mt-6 font-courier text-sm">
          <p className="text-[#333]/85">
            Nous allons générer des structures de nuits le long de l’axe{" "}
            <strong>{startLabel}</strong> → <strong>{endLabel}</strong>
            {returnToStart ? " (boucle)" : ""}.
          </p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setStep(4)} className="flex-1 rounded-full border-2 py-2">
              Retour
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                persist();
                void fetchStructures();
              }}
              className="flex-1 rounded-full bg-[var(--color-accent-start)] py-2 font-bold text-white disabled:opacity-60"
            >
              {loading ? "…" : "Générer les structures"}
            </button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="mt-6 space-y-4 font-courier text-sm">
          {structures.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPicked(s)}
              className={`block w-full rounded-xl border-2 p-4 text-left ${
                picked?.id === s.id ? "border-[var(--color-accent-start)] bg-[#FFF2EB]" : "border-[var(--color-accent-end)]/25"
              }`}
            >
              <span className="font-bold text-[var(--color-accent-end)]">{s.label}</span>
              <p className="mt-1 text-xs">{s.mobility}</p>
              <p className="mt-2 text-xs">{s.bases.map((b) => `${b.name} (${b.nights} n.)`).join(" → ")}</p>
            </button>
          ))}
          {picked && (
            <>
              <ul className="list-inside list-disc text-xs">
                {picked.explanations.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
              {(picked.enrichments ?? []).map((seg) => (
                <div key={seg.segmentIndex} className="rounded-lg bg-[#FFF2EB]/60 p-2 text-xs">
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
              {applyError && <p className="text-xs text-red-600">{applyError}</p>}
              <button
                type="button"
                onClick={() => openInPlanning(picked)}
                className="w-full rounded-full bg-[var(--color-accent-start)] py-3 font-bold text-white"
              >
                Ouvrir dans le planning
              </button>
            </>
          )}
          <button type="button" onClick={() => setStep(5)} className="text-xs underline">
            Retour
          </button>
        </div>
      )}
    </main>
  );
}
