"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { loadTripDraft, saveTripDraft } from "@/lib/planifier-draft";
import { addFavorite } from "@/lib/planifier-favorites";
import { diagnosePlaces } from "@/lib/trip-engine/suggest";
import { structureToPlanningPayload } from "@/lib/planifier-structure-to-steps";
import type { StructureOption } from "@/lib/trip-engine/types";

type PlaceRow = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  weight: "hard" | "soft" | "bonus";
};

export default function LieuxFlowClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [q, setQ] = useState("");
  const [weight, setWeight] = useState<"hard" | "soft" | "bonus">("soft");
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [returnToStart, setReturnToStart] = useState(false);
  const [startLabel, setStartLabel] = useState("");
  const [endLabel, setEndLabel] = useState("");
  const [treatmentChoice, setTreatmentChoice] = useState<string | undefined>();
  const [structures, setStructures] = useState<StructureOption[]>([]);
  const [picked, setPicked] = useState<StructureOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const persist = useCallback(() => {
    saveTripDraft({
      mode: "places",
      updatedAt: new Date().toISOString(),
      places: {
        items: places.map((p) => ({
          id: p.id,
          label: p.label,
          lat: p.lat,
          lng: p.lng,
          weight: p.weight,
        })),
        startLabel: startLabel || undefined,
        endLabel: endLabel || undefined,
        returnToStart,
        days,
        treatmentChoice,
      },
    });
  }, [places, startLabel, endLabel, returnToStart, days, treatmentChoice]);

  useEffect(() => {
    const d = loadTripDraft();
    if (d?.mode === "places" && d.places) {
      const p = d.places;
      setPlaces(
        p.items.map((x) => ({
          id: x.id,
          label: x.label,
          lat: x.lat,
          lng: x.lng,
          weight: x.weight,
        }))
      );
      setStartLabel(p.startLabel ?? "");
      setEndLabel(p.endLabel ?? "");
      setReturnToStart(p.returnToStart);
      setDays(p.days);
      setTreatmentChoice(p.treatmentChoice);
    }
  }, []);

  async function addPlace() {
    setGeoErr(null);
    if (!q.trim()) return;
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Lieu introuvable");
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `p-${Date.now()}`;
      setPlaces((prev) => [
        ...prev,
        {
          id,
          label: j.name ?? q.trim(),
          lat: j.lat,
          lng: j.lng,
          weight,
        },
      ]);
      setQ("");
    } catch (e) {
      setGeoErr(e instanceof Error ? e.message : "Erreur");
    }
  }

  function removePlace(id: string) {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  }

  const diagnostic = diagnosePlaces({
    days,
    places: places.map((p) => ({
      id: p.id,
      label: p.label,
      lat: p.lat,
      lng: p.lng,
      weight: p.weight,
    })),
  });

  async function fetchStructures() {
    setLoading(true);
    try {
      const res = await fetch("/api/trip-planning/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "places",
          days,
          pace: "equilibre",
          tripForm: "multi_bases",
          notoriety: "equilibre",
          priorities: [],
          places: places.map((p) => ({
            id: p.id,
            label: p.label,
            lat: p.lat,
            lng: p.lng,
            weight: p.weight,
          })),
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
      <h1 className="font-courier text-2xl font-bold text-[#333]">Lieux déjà choisis</h1>
      <p className="mt-1 font-courier text-sm text-[#333]/80">Étape {step} / 6</p>

      {step === 1 && (
        <div className="mt-6 space-y-3 font-courier text-sm">
          <label className="block">
            <span className="font-bold text-[var(--color-accent-end)]">Rechercher un lieu</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ville ou lieu en France"
              className="mt-1 w-full rounded-lg border-2 border-[var(--color-accent-end)]/25 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="font-bold text-[var(--color-accent-end)]">Statut</span>
            <select
              value={weight}
              onChange={(e) => setWeight(e.target.value as typeof weight)}
              className="mt-1 w-full rounded-lg border-2 border-[var(--color-accent-end)]/25 px-3 py-2"
            >
              <option value="hard">Indispensable</option>
              <option value="soft">Important</option>
              <option value="bonus">Bonus</option>
            </select>
          </label>
          {geoErr && <p className="text-xs text-red-600">{geoErr}</p>}
          <button
            type="button"
            onClick={() => void addPlace()}
            className="w-full rounded-full bg-[var(--color-accent-start)] py-2.5 font-bold text-white"
          >
            Ajouter
          </button>
          <ul className="space-y-2 border-t border-[var(--color-accent-end)]/15 pt-4">
            {places.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-[#FFF2EB]/40 px-3 py-2 text-xs"
              >
                <span>
                  <strong>{p.label}</strong> — {p.weight}
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      addFavorite({
                        kind: "place",
                        status: p.weight === "hard" ? "hard" : "soft",
                        label: p.label,
                        refId: p.id,
                        meta: { lat: p.lat, lng: p.lng },
                      })
                    }
                    className="text-[var(--color-accent-end)] underline"
                  >
                    Cœur
                  </button>
                  <button type="button" onClick={() => removePlace(p.id)} className="text-red-600 underline">
                    Retirer
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={places.length === 0}
            onClick={() => {
              persist();
              setStep(2);
            }}
            className="w-full rounded-full border-2 border-[var(--color-accent-end)]/30 py-2 font-bold disabled:opacity-40"
          >
            Continuer
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-3 font-courier text-sm">
          <p className="text-xs text-[#333]/85">Statut par lieu (modifiable).</p>
          {places.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
              <span className="text-xs font-bold">{p.label}</span>
              <select
                value={p.weight}
                onChange={(e) =>
                  setPlaces((prev) =>
                    prev.map((x) =>
                      x.id === p.id ? { ...x, weight: e.target.value as PlaceRow["weight"] } : x
                    )
                  )
                }
                className="rounded border px-2 py-1 text-xs"
              >
                <option value="hard">Indispensable</option>
                <option value="soft">Important</option>
                <option value="bonus">Bonus</option>
              </select>
            </div>
          ))}
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
        <div className="mt-6 space-y-3 font-courier text-sm">
          <label className="block">
            <span className="font-bold text-[var(--color-accent-end)]">Départ (optionnel, texte libre)</span>
            <input
              value={startLabel}
              onChange={(e) => setStartLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border-2 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="font-bold text-[var(--color-accent-end)]">Arrivée (optionnel)</span>
            <input
              value={endLabel}
              onChange={(e) => setEndLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border-2 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={returnToStart}
              onChange={(e) => setReturnToStart(e.target.checked)}
            />
            Retour au départ
          </label>
          <label className="block">
            <span className="font-bold text-[var(--color-accent-end)]">Nombre de jours</span>
            <input
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border-2 px-3 py-2"
            />
          </label>
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
        <div className="mt-6 space-y-4 font-courier text-sm">
          <div
            className={`rounded-xl border-2 p-4 ${
              diagnostic.level === "faisable"
                ? "border-green-600/40 bg-green-50/50"
                : diagnostic.level === "deux_voyages"
                  ? "border-amber-600/50 bg-amber-50/60"
                  : "border-[var(--color-accent-start)]/40 bg-[#FFF2EB]/50"
            }`}
          >
            <p className="font-bold text-[var(--color-accent-end)]">{diagnostic.title}</p>
            <p className="mt-2 text-xs leading-relaxed">{diagnostic.detail}</p>
          </div>
          <p className="text-xs font-bold text-[var(--color-accent-end)]">Pistes</p>
          <div className="flex flex-col gap-2">
            {diagnostic.suggestedActions.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setTreatmentChoice(a.id)}
                className={`rounded-lg border-2 px-3 py-2 text-left text-xs ${
                  treatmentChoice === a.id ? "border-[var(--color-accent-start)] bg-[#FFF2EB]" : "border-[var(--color-accent-end)]/20"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
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
          <p className="text-xs text-[#333]/85">
            Traitement retenu : <strong>{treatmentChoice ?? "non précisé"}</strong>. Génération des structures
            autour de tes lieux.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              persist();
              void fetchStructures();
            }}
            className="mt-4 w-full rounded-full bg-[var(--color-accent-start)] py-3 font-bold text-white disabled:opacity-60"
          >
            {loading ? "…" : "Générer l’itinéraire enrichi"}
          </button>
          <button type="button" onClick={() => setStep(4)} className="mt-2 w-full text-xs underline">
            Retour
          </button>
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
