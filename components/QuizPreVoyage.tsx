"use client";

import { useState } from "react";
import type {
  QuizPreVoyageAnswers,
  CadreOption,
  EtapeType,
  MixeurEtapesNiveaux,
  MixeurNiveau,
  PlageType,
  TriPreference,
} from "../data/quiz-types";

const REGIONS = [
  "Peu importe",
  "Occitanie",
  "Provence-Alpes-Côte d'Azur",
  "Bretagne",
  "Normandie",
  "Loire",
  "Bourgogne-Franche-Comté",
  "Alsace",
  "Auvergne-Rhône-Alpes",
  "Nouvelle-Aquitaine",
] as const;

const REGIONS_SANS_PEU_IMPORTE = REGIONS.filter((r) => r !== "Peu importe");

const AVEC_QUI = [
  { value: "solo" as const, label: "Solo" },
  { value: "couple" as const, label: "Couple" },
  { value: "famille" as const, label: "Famille" },
  { value: "amis" as const, label: "Amis" },
];

function isVoyageCourt(dureeJours: number): boolean {
  // Hypothèse : voyage "court" = 5 jours ou moins.
  return dureeJours <= 5;
}

const ETAPES: { key: EtapeType; label: string }[] = [
  { key: "plages", label: "Plages" },
  { key: "randos", label: "Randos / nature" },
  { key: "villages", label: "Villages" },
  { key: "villes", label: "Villes" },
  { key: "chateaux", label: "Châteaux / abbayes" },
  { key: "musees", label: "Musées" },
];

const MIXEUR_LABELS: Record<MixeurNiveau, string> = {
  0: "Pas du tout",
  1: "Un peu",
  2: "Souvent",
  3: "À fond",
};

const CADRES: { value: CadreOption; label: string }[] = [
  { value: "bord_de_mer", label: "Bord de mer" },
  { value: "montagne", label: "Montagne" },
  { value: "vignoble", label: "Vignobles" },
  { value: "campagne", label: "Campagne / forêt" },
  { value: "lac", label: "Lac" },
  { value: "grandes_villes", label: "Grandes villes" },
];

const ARCHI_OPTIONS = [
  { value: "vieilles_pierres" as const, label: "Vieilles pierres" },
  { value: "colombages" as const, label: "Colombages" },
  { value: "brique" as const, label: "Brique" },
  { value: "ardoise" as const, label: "Ardoise" },
  { value: "je_men_fiche" as const, label: "Je m'en fiche" },
];

const PLAGE_TYPES: { value: PlageType; label: string }[] = [
  { value: "grande_plage", label: "Grande plage" },
  { value: "crique", label: "Crique" },
  { value: "calanque", label: "Calanque" },
  { value: "plage_lac", label: "Plage de lac" },
];

function triButtons(): { value: TriPreference; label: string }[] {
  return [
    { value: "peu_importe", label: "Peu importe" },
    { value: "oui", label: "Oui" },
    { value: "non", label: "Non" },
  ];
}

function deriveMixeurFromLegacy(a: Partial<QuizPreVoyageAnswers>): MixeurEtapesNiveaux | undefined {
  if (a.mixeurEtapes) return a.mixeurEtapes;

  if (a.ambiances) {
    const map: Record<string, MixeurNiveau> = { beaucoup: 3, un_peu: 1, passer: 0 };
    return {
      chateaux: map[a.ambiances.chateaux ?? "passer"],
      villages: map[a.ambiances.villages ?? "passer"],
      villes: map[a.ambiances.villes ?? "passer"],
      musees: map[a.ambiances.musees ?? "passer"],
      randos: map[a.ambiances.randos ?? "passer"],
      plages: map[a.ambiances.plages ?? "passer"],
    };
  }

  if (a.activitePrincipale) {
    if (a.activitePrincipale === "plages_uniquement") return { plages: 3 };
    if (a.activitePrincipale === "randos_uniquement") return { randos: 3 };
    if (a.activitePrincipale === "villes_villages") return { villes: 2, villages: 2, chateaux: 1, musees: 1 };
    if (a.activitePrincipale === "mix") return { plages: 2, randos: 2, villes: 2, villages: 2, chateaux: 1, musees: 1 };
  }

  return undefined;
}

interface QuizPreVoyageProps {
  initialAnswers?: Partial<QuizPreVoyageAnswers>;
  onSubmit: (answers: QuizPreVoyageAnswers) => void;
  submitting?: boolean;
}

function getMaxRegions(dureeJours: number): number {
  if (dureeJours < 7) return 1;
  if (dureeJours < 14) return 2;
  return 3;
}

export default function QuizPreVoyage({
  initialAnswers = {},
  onSubmit,
  submitting = false,
}: QuizPreVoyageProps) {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5 | 11>(0);
  const [answers, setAnswers] = useState<Partial<QuizPreVoyageAnswers>>(() => {
    const a = { ...initialAnswers };
    if (!a.regions?.length && a.region && a.region !== "Peu importe") {
      a.regions = [a.region];
    }

    // Backfill du mixeur depuis l'ancien quiz
    const legacyMixeur = deriveMixeurFromLegacy(a);
    if (!a.mixeurEtapes && legacyMixeur) a.mixeurEtapes = legacyMixeur;

    // Inférer l'inspiration si déjà des régions
    if (!a.regionsInspiration) {
      if ((a.regions && a.regions.length > 0) || (a.region && a.region !== "Peu importe")) {
        a.regionsInspiration = "jai_une_idee";
      }
    }
    return a;
  });

  function update<K extends keyof QuizPreVoyageAnswers>(
    key: K,
    value: QuizPreVoyageAnswers[K]
  ) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const dureeJours = answers.dureeJours ?? 7;
  const maxRegions = getMaxRegions(dureeJours);
  const regionsChoisies = answers.regions ?? [];
  const regionsInspiration = answers.regionsInspiration;
  const hasNoInspiPath = regionsInspiration === "pas_d_inspi";

  const mixeur: MixeurEtapesNiveaux = answers.mixeurEtapes ?? {};
  const included = (k: EtapeType) => (mixeur[k] ?? 0) > 0;
  const includedTypes = ETAPES.filter((e) => included(e.key));

  // Cadres : disponibles même sur voyages longs (optionnel), sauf si on a déjà pris le chemin "pas d'inspi"
  // (dans ce cas, cadres ont déjà été demandés avant les régions).
  const showCadresFin = !hasNoInspiPath;

  // Toggle une région (multi-select, max = maxRegions)
  function toggleRegion(region: string) {
    if (region === "Peu importe") {
      update("regions", []);
      update("region", "Peu importe");
      return;
    }
    const current = answers.regions ?? [];
    const hasPeuImporte = current.length === 0 && answers.region === "Peu importe";
    let next: string[];
    if (current.includes(region)) {
      next = current.filter((r) => r !== region);
    } else if (current.length >= maxRegions) {
      next = [...current.slice(1), region];
    } else {
      next = [...current.filter((r) => r !== "Peu importe"), region];
    }
    update("regions", next);
    if (next.length === 0) update("region", "Peu importe");
    else update("region", undefined);
  }

  function getNextStep(): (typeof step) | "submit" {
    if (step === 0) return 1;
    if (step === 1) {
      if (regionsInspiration === "pas_d_inspi") return 11;
      return 2;
    }
    if (step === 11) return 2;
    if (step === 2) return 3;
    if (step === 3) return 4;
    if (step === 4) {
      if (showCadresFin) return 5;
      return "submit";
    }
    if (step === 5) return "submit";
    return "submit";
  }

  function getPrevStep(): (typeof step) | null {
    if (step === 0) return null;
    if (step === 1) return 0;
    if (step === 11) return 1;
    if (step === 2) return hasNoInspiPath ? 11 : 1;
    if (step === 3) return 2;
    if (step === 4) return 3;
    if (step === 5) return 4;
    return 0;
  }

  function handleNext() {
    const next = getNextStep();
    if (next === "submit") {
      // Rythme dérivé de etapesParJour
      const etapes = answers.etapesParJour ?? 2;
      const rythme = etapes === 1 ? "cool" : etapes === 2 ? "normal" : "intense";
      const final = {
        ...answers,
        rythme,
        region:
          (answers.regions ?? []).length > 0
            ? undefined
            : answers.region ?? "Peu importe",
      } as QuizPreVoyageAnswers;
      onSubmit(final);
    } else {
      setStep(next);
    }
  }

  function handlePrev() {
    const prev = getPrevStep();
    if (prev !== null) setStep(prev);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleNext();
  }

  const nextLabel =
    getNextStep() === "submit"
      ? "Valider et voir les propositions"
      : "Suivant";
  const canNext =
    step === 0
      ? dureeJours >= 1
      : step === 1
        ? !!regionsInspiration
        : step === 3
          ? includedTypes.length > 0
          : true;

  function toggleCadre(c: CadreOption, max = 3) {
    const current = answers.cadresChoisis ?? [];
    const selected = current.includes(c);
    let next: CadreOption[];
    if (selected) next = current.filter((x) => x !== c);
    else if (current.length >= max) next = [...current.slice(1), c];
    else next = [...current, c];
    update("cadresChoisis", next);
  }

  function toggleArchi(v: NonNullable<QuizPreVoyageAnswers["goutArchitecture"]>[number]) {
    const current = answers.goutArchitecture ?? [];
    const selected = current.includes(v);

    if (v === "je_men_fiche") {
      update("goutArchitecture", selected ? [] : ["je_men_fiche"]);
      return;
    }

    const cleaned = current.filter((x) => x !== "je_men_fiche");
    const next = selected ? cleaned.filter((x) => x !== v) : [...cleaned, v];
    update("goutArchitecture", next);
  }

  function setMixeurLevel(k: EtapeType, lvl: MixeurNiveau) {
    update("mixeurEtapes", { ...(answers.mixeurEtapes ?? {}), [k]: lvl });
  }

  function toggleMixeurType(k: EtapeType) {
    const current = (answers.mixeurEtapes ?? {})[k] ?? 0;
    if (current > 0) setMixeurLevel(k, 0);
    else setMixeurLevel(k, 2);
  }

  function togglePlageType(pt: PlageType) {
    const current = answers.plageTypes ?? [];
    const selected = current.includes(pt);
    const next = selected ? current.filter((x) => x !== pt) : [...current, pt];
    update("plageTypes", next);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Indicateur d'étape */}
      {(() => {
        const displayStep =
          step === 0 ? 0
          : step === 1 || step === 11 ? 1
          : step === 2 ? 2
          : step === 3 ? 3
          : step === 4 ? 4
          : 5;
        // 0 cadrage, 1 inspiration (+ tiroir), 2 régions, 3 mixeur, 4 détails, 5 cadres fin (optionnel)
        const totalSteps = showCadresFin ? 6 : 5;
        return (
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }, (_, s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition ${
                  s <= displayStep ? "bg-[#A55734]" : "bg-[#A55734]/20"
                }`}
              />
            ))}
          </div>
        );
      })()}

      {/* ÉTAPE 0 — Cadrage */}
      {step === 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-[#333333]">
            Cadrage du voyage
          </h3>
          <fieldset>
            <label className="mb-2 block text-sm font-medium text-[#333333]">
              Durée (en jours)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={dureeJours}
              onChange={(e) => update("dureeJours", Number(e.target.value))}
              className="w-full rounded-lg border border-[#A55734]/30 bg-white px-4 py-3 text-[#333333] focus:border-[#A55734] focus:outline-none focus:ring-1 focus:ring-[#A55734]/30"
            />
          </fieldset>
          <fieldset>
            <label className="mb-2 block text-sm font-medium text-[#333333]">
              Nombre d&apos;étapes par jour
            </label>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update("etapesParJour", n)}
                  className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    (answers.etapesParJour ?? 2) === n
                      ? "border-2 border-[#A55734] bg-[#FFF2EB]/50 text-[#333333]"
                      : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
                  }`}
                >
                  {n} étape{n > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <label className="mb-2 block text-sm font-medium text-[#333333]">
              Point de départ (ta ville ou le début du trip)
            </label>
            <input
              type="text"
              value={answers.pointDepart ?? ""}
              onChange={(e) => update("pointDepart", e.target.value)}
              placeholder="Ex. Paris, Lyon…"
              className="w-full rounded-lg border border-[#A55734]/30 bg-white px-4 py-3 text-[#333333] placeholder:text-[#999999] focus:border-[#A55734] focus:outline-none focus:ring-1 focus:ring-[#A55734]/30"
            />
          </fieldset>
          <fieldset>
            <label className="mb-2 block text-sm font-medium text-[#333333]">
              Avec qui pour ce voyage
            </label>
            <div className="flex flex-wrap gap-2">
              {AVEC_QUI.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("avecQui", value)}
                  className={`rounded-lg px-4 py-2 text-sm transition ${
                    answers.avecQui === value
                      ? "bg-[#A55734] text-white"
                      : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {/* ÉTAPE 1 — Régions : inspiration ? */}
      {step === 1 && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-[#333333]">
            Pour les régions : tu as une idée ?
          </h3>
          <div className="space-y-2">
            {(
              [
                { value: "jai_une_idee" as const, label: "Oui, j'ai une idée" },
                { value: "pas_d_inspi" as const, label: "Non, je n'ai pas d'inspi" },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => update("regionsInspiration", value)}
                className={`block w-full rounded-lg px-4 py-3 text-left text-sm transition ${
                  regionsInspiration === value
                    ? "border-2 border-[#A55734] bg-[#FFF2EB]/50"
                    : "border border-[#A55734]/30 bg-white hover:border-[#A55734]/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm text-[#333333]/70">
            Si tu n&apos;as pas d&apos;inspiration, on te posera une question rapide de cadre/architecture pour t&apos;aider à choisir.
          </p>
        </div>
      )}

      {/* ÉTAPE 1B — Chemin "pas d'inspi" : cadres + architecture (avant régions) */}
      {step === 11 && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-[#333333]">
            Aide au choix des régions
          </h3>
          <p className="text-sm text-[#333333]/70">
            Choisis jusqu&apos;à 3 cadres (optionnel). On s&apos;en servira pour te guider et affiner la sélection.
          </p>
          <div className="flex flex-wrap gap-2">
            {CADRES.map(({ value, label }) => {
              const selected = (answers.cadresChoisis ?? []).includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleCadre(value, 3)}
                  className={`rounded-lg px-4 py-2 text-sm transition ${
                    selected
                      ? "bg-[#A55734] text-white"
                      : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-[#333333]">
              Architecture qui te plaît (optionnel)
            </h4>
            <div className="flex flex-wrap gap-2">
              {ARCHI_OPTIONS.map(({ value, label }) => {
                const selected = (answers.goutArchitecture ?? []).includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleArchi(value)}
                    className={`rounded-lg px-4 py-2 text-sm transition ${
                      selected
                        ? "bg-[#A55734] text-white"
                        : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ÉTAPE 2 — Région(s) */}
      {step === 2 && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-[#333333]">
            Région(s) — jusqu&apos;à {maxRegions} selon ta durée
          </h3>
          <p className="text-sm text-[#333333]/70">
            Tu as choisi {dureeJours} jour{dureeJours > 1 ? "s" : ""} → tu peux
            sélectionner jusqu&apos;à {maxRegions} région{maxRegions > 1 ? "s" : ""}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                update("regions", []);
                update("region", "Peu importe");
              }}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                regionsChoisies.length === 0
                  ? "bg-[#A55734] text-white"
                  : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
              }`}
            >
              Peu importe
            </button>
            {REGIONS_SANS_PEU_IMPORTE.map((r) => {
              const selected = regionsChoisies.includes(r);
              const disabled =
                !selected && regionsChoisies.length >= maxRegions;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleRegion(r)}
                  className={`rounded-lg px-4 py-2 text-sm transition ${
                    selected
                      ? "bg-[#A55734] text-white"
                      : disabled
                        ? "cursor-not-allowed border border-[#A55734]/20 bg-[#f5f5f5] text-[#999999]"
                        : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ÉTAPE 3 — Mixeur : types + niveau 0–3 */}
      {step === 3 && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-[#333333]">
            Ton mix de voyage
          </h3>
          <p className="text-sm text-[#333333]/70">
            Coche ce que tu veux voir dans ton voyage, puis règle l&apos;intensité (0 à 3). On normalise automatiquement.
          </p>

          <div className="space-y-3">
            {ETAPES.map(({ key, label }) => {
              const lvl = (mixeur[key] ?? 0) as MixeurNiveau;
              const active = lvl > 0;
              return (
                <div
                  key={key}
                  className={`rounded-lg border px-4 py-3 ${
                    active ? "border-[#A55734]/40 bg-white" : "border-[#A55734]/20 bg-white/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleMixeurType(key)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-[#A55734] text-white"
                          : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
                      }`}
                    >
                      {active ? "Inclus" : "Ajouter"}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#333333]">{label}</span>
                        <span className="text-xs text-[#333333]/70">
                          {MIXEUR_LABELS[lvl]}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={3}
                        step={1}
                        value={lvl}
                        onChange={(e) => setMixeurLevel(key, Number(e.target.value) as MixeurNiveau)}
                        className="mt-2 w-full accent-[#A55734]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {includedTypes.length > 0 && (
            <div className="rounded-lg border border-[#A55734]/20 bg-[#FFF2EB]/30 px-4 py-3 text-sm text-[#333333]/80">
              Inclus : <strong>{includedTypes.map((t) => t.label).join(", ")}</strong>
            </div>
          )}
        </div>
      )}

      {/* ÉTAPE 4 — Détails (tiroirs conditionnels) */}
      {step === 4 && (
        <div className="space-y-8">
          <h3 className="text-lg font-medium text-[#333333]">Détails (optionnel)</h3>

          {/* Plages */}
          {included("plages") && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-[#333333]">Plages</h4>
              <div className="flex flex-wrap gap-2">
                {PLAGE_TYPES.map(({ value, label }) => {
                  const selected = (answers.plageTypes ?? []).includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => togglePlageType(value)}
                      className={`rounded-lg px-4 py-2 text-sm transition ${
                        selected
                          ? "bg-[#A55734] text-white"
                          : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {(
                [
                  { key: "plageSurf" as const, label: "Spot de surf" },
                  { key: "plageNaturiste" as const, label: "Naturiste" },
                  { key: "plageFamiliale" as const, label: "Familiale" },
                ] as const
              ).map(({ key, label }) => (
                <fieldset key={key} className="space-y-2">
                  <label className="block text-sm text-[#333333]">{label}</label>
                  <div className="flex flex-wrap gap-2">
                    {triButtons().map(({ value, label: l }) => {
                      const selected = (answers[key] ?? "peu_importe") === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => update(key, value as any)}
                          className={`rounded-lg px-4 py-2 text-sm transition ${
                            selected
                              ? "bg-[#A55734] text-white"
                              : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
                          }`}
                        >
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {/* Randos */}
          {included("randos") && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-[#333333]">Randos</h4>
              <fieldset className="space-y-2">
                <label className="block text-sm text-[#333333]">Niveau</label>
                <div className="flex flex-wrap gap-2">
                  {(["peu_importe", "facile", "modere", "difficile"] as const).map((v) => {
                    const selected = (answers.randoNiveauSouhaite ?? "peu_importe") === v;
                    const label =
                      v === "peu_importe" ? "Peu importe" : v === "facile" ? "Facile" : v === "modere" ? "Modéré" : "Difficile";
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => update("randoNiveauSouhaite", v)}
                        className={`rounded-lg px-4 py-2 text-sm transition ${
                          selected
                            ? "bg-[#A55734] text-white"
                            : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <label className="block text-sm text-[#333333]">Durée</label>
                <div className="flex flex-wrap gap-2">
                  {(["peu_importe", "courte", "moyenne", "longue"] as const).map((v) => {
                    const selected = (answers.randoDuree ?? "peu_importe") === v;
                    const label =
                      v === "peu_importe" ? "Peu importe" : v === "courte" ? "Courte" : v === "moyenne" ? "Moyenne" : "Longue";
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => update("randoDuree", v)}
                        className={`rounded-lg px-4 py-2 text-sm transition ${
                          selected
                            ? "bg-[#A55734] text-white"
                            : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <label className="block text-sm text-[#333333]">Dénivelé</label>
                <div className="flex flex-wrap gap-2">
                  {(["peu_importe", "faible", "moyen", "fort"] as const).map((v) => {
                    const selected = (answers.randoDenivele ?? "peu_importe") === v;
                    const label =
                      v === "peu_importe" ? "Peu importe" : v === "faible" ? "Faible" : v === "moyen" ? "Moyen" : "Fort";
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => update("randoDenivele", v)}
                        className={`rounded-lg px-4 py-2 text-sm transition ${
                          selected
                            ? "bg-[#A55734] text-white"
                            : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}

          {/* Villes/Villages */}
          {(included("villes") || included("villages")) && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-[#333333]">Villes & villages</h4>

              {included("villes") && (
                <>
                  <fieldset>
                    <label className="mb-2 block text-sm text-[#333333]">
                      Incontournables ou pépites (villes)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={answers.pepitesPourcent ?? 50}
                      onChange={(e) => update("pepitesPourcent", Number(e.target.value))}
                      className="w-full accent-[#A55734]"
                    />
                    <div className="mt-1 flex justify-between text-xs text-[#333333]/70">
                      <span>Classiques</span>
                      <span className="font-medium text-[#333333]">
                        {answers.pepitesPourcent ?? 50} %
                      </span>
                      <span>Pépites</span>
                    </div>
                  </fieldset>

                  {(() => {
                    const p = answers.pepitesPourcent ?? 50;
                    if (p <= 10) {
                      return (
                        <div className="rounded-lg border border-[#A55734]/30 bg-[#FFF2EB]/50 px-4 py-3 text-sm text-[#333333]">
                          <strong>Très classique</strong> — Itinéraire très touristique : on garde surtout les incontournables.
                        </div>
                      );
                    }
                    if (p >= 90) {
                      return (
                        <div className="rounded-lg border border-amber-400/50 bg-amber-50/80 px-4 py-3 text-sm text-[#333333]">
                          <strong>Très pépites</strong> — Mode exploration : tu peux rater des incontournables. Les rares “classiques” restants seront les plus évidents.
                        </div>
                      );
                    }
                    if (p <= 33) {
                      return (
                        <div className="rounded-lg border border-[#A55734]/20 bg-white/80 px-4 py-3 text-sm text-[#333333]/80">
                          Orientation classiques — On privilégie les lieux connus (sans sacrifier l’esthétique).
                        </div>
                      );
                    }
                    if (p >= 67) {
                      return (
                        <div className="rounded-lg border border-[#A55734]/20 bg-white/80 px-4 py-3 text-sm text-[#333333]/80">
                          Orientation pépites — On privilégie les lieux moins connus (villes et villages).
                        </div>
                      );
                    }
                    return (
                      <div className="rounded-lg border border-[#A55734]/20 bg-white/80 px-4 py-3 text-sm text-[#333333]/80">
                        Bon équilibre — Un mix de classiques et de pépites.
                      </div>
                    );
                  })()}

                  <fieldset className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="eviterGrandesVilles"
                      checked={answers.eviterGrandesVilles ?? false}
                      onChange={(e) => update("eviterGrandesVilles", e.target.checked)}
                      className="h-4 w-4 accent-[#A55734]"
                    />
                    <label htmlFor="eviterGrandesVilles" className="text-sm text-[#333333]">
                      Éviter à tout prix les grandes villes
                    </label>
                  </fieldset>
                </>
              )}

              {/* Architecture : si déjà demandée dans le chemin "pas d'inspi", on évite la redondance */}
              {!hasNoInspiPath && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-[#333333]">
                    Architecture qui te plaît (optionnel)
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {ARCHI_OPTIONS.map(({ value, label }) => {
                      const selected = (answers.goutArchitecture ?? []).includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleArchi(value)}
                          className={`rounded-lg px-4 py-2 text-sm transition ${
                            selected
                              ? "bg-[#A55734] text-white"
                              : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ÉTAPE 5 — Cadres (optionnel) */}
      {step === 5 && showCadresFin && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-[#333333]">
            Cadres (optionnel)
          </h3>
          <p className="text-sm text-[#333333]/70">
            Choisis jusqu&apos;à 3 cadres pour orienter le voyage (côte vs intérieur, montagne vs plaine, etc.).
          </p>
          <div className="flex flex-wrap gap-2">
            {CADRES.map(({ value, label }) => {
              const selected = (answers.cadresChoisis ?? []).includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleCadre(value, 3)}
                  className={`rounded-lg px-4 py-2 text-sm transition ${
                    selected
                      ? "bg-[#A55734] text-white"
                      : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <button
          type="button"
          onClick={handlePrev}
          disabled={getPrevStep() === null}
          className="rounded-lg border border-[#A55734]/40 px-4 py-3 font-medium text-[#333333] transition hover:bg-[#FFF2EB]/50 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          Précédent
        </button>
        <button
          type="submit"
          disabled={!canNext || submitting}
          className="rounded-lg bg-[#A55734] px-6 py-3 font-medium text-white transition hover:bg-[#8b4728] disabled:opacity-50"
        >
          {submitting ? "En cours…" : nextLabel}
        </button>
      </div>
    </form>
  );
}
