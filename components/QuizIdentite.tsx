"use client";

import { useState } from "react";
import type { QuizIdentiteAnswers } from "../data/quiz-types";

const AGE_TRANCHES = [
  { value: "18-25", label: "18-25 ans" },
  { value: "26-35", label: "26-35 ans" },
  { value: "36-50", label: "36-50 ans" },
  { value: "50+", label: "50 ans et +" },
] as const;

const AVEC_QUI = [
  { value: "solo", label: "Solo" },
  { value: "couple", label: "Couple" },
  { value: "famille", label: "Famille" },
  { value: "amis", label: "Amis" },
] as const;

const ARCHITECTURE = [
  { value: "colombages", label: "Colombages" },
  { value: "vieilles_pierres", label: "Vieilles pierres" },
  { value: "brique", label: "Brique" },
  { value: "ardoise", label: "Ardoise" },
  { value: "je_men_fiche", label: "Je m'en fiche" },
] as const;

const RYTHME = [
  { value: "roule_beaucoup", label: "On roule beaucoup, on voit plein de trucs" },
  { value: "deux_etapes_max", label: "On prend le temps, 2 étapes par jour max" },
] as const;

const BUDGET = [
  { value: "je_depense_pas", label: "Je dépense pas" },
  { value: "raisonnable", label: "Raisonnable" },
  { value: "je_me_fais_plaisir", label: "Je me fais plaisir" },
] as const;

const INCONTOURNABLES = [
  { value: "classiques", label: "Les classiques, ce qu'il faut avoir vu" },
  { value: "meconnu", label: "Ce que personne ne connaît" },
  { value: "mix", label: "Un mix des deux" },
] as const;

interface QuizIdentiteProps {
  initialAnswers?: Partial<QuizIdentiteAnswers>;
  onSave: (answers: QuizIdentiteAnswers) => void;
  saving?: boolean;
}

export default function QuizIdentite({
  initialAnswers = {},
  onSave,
  saving = false,
}: QuizIdentiteProps) {
  const [answers, setAnswers] = useState<Partial<QuizIdentiteAnswers>>(initialAnswers);

  function update<K extends keyof QuizIdentiteAnswers>(
    key: K,
    value: QuizIdentiteAnswers[K]
  ) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArchitecture(val: (typeof ARCHITECTURE)[number]["value"]) {
    const current = (answers.goutArchitecture ?? []) as string[];
    const next = current.includes(val)
      ? current.filter((x) => x !== val)
      : [...current, val];
    update("goutArchitecture", next as QuizIdentiteAnswers["goutArchitecture"]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(answers as QuizIdentiteAnswers);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Prénom
        </label>
        <input
          type="text"
          value={answers.prenom ?? ""}
          onChange={(e) => update("prenom", e.target.value)}
          placeholder="Ex. Marc"
          className="w-full rounded-lg border border-[#A55734]/30 bg-white px-4 py-3 text-[#333333] placeholder:text-[#999999] focus:border-[#A55734] focus:outline-none focus:ring-1 focus:ring-[#A55734]/30"
        />
      </fieldset>

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Tranche d&apos;âge
        </label>
        <div className="flex flex-wrap gap-2">
          {AGE_TRANCHES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update("ageTranche", value)}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                answers.ageTranche === value
                  ? "bg-[#A55734] text-white"
                  : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Ville d&apos;origine
        </label>
        <input
          type="text"
          value={answers.villeOrigine ?? ""}
          onChange={(e) => update("villeOrigine", e.target.value)}
          placeholder="Ex. Paris, Lyon…"
          className="w-full rounded-lg border border-[#A55734]/30 bg-white px-4 py-3 text-[#333333] placeholder:text-[#999999] focus:border-[#A55734] focus:outline-none focus:ring-1 focus:ring-[#A55734]/30"
        />
      </fieldset>

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Avec qui tu voyages habituellement
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

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Goûts architecturaux
        </label>
        <p className="mb-2 text-sm text-[#333333]/70">
          Choisis tout ce qui te plaît (ou « je m&apos;en fiche »)
        </p>
        <div className="flex flex-wrap gap-2">
          {ARCHITECTURE.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleArchitecture(value)}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                (answers.goutArchitecture ?? []).includes(value)
                  ? "bg-[#A55734] text-white"
                  : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Ton rapport mer / montagne / campagne / ville (0 = zéro, 10 = à fond)
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["rapportMer", "rapportMontagne", "rapportCampagne", "rapportVille"] as const).map(
            (key) => {
              const labels = {
                rapportMer: "Mer",
                rapportMontagne: "Montagne",
                rapportCampagne: "Campagne",
                rapportVille: "Ville",
              };
              const val = answers[key] ?? 5;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-[#333333]">
                    {labels[key]}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={val}
                    onChange={(e) => update(key, Number(e.target.value))}
                    className="flex-1 accent-[#A55734]"
                  />
                  <span className="w-6 text-right text-sm text-[#333333]">{val}</span>
                </div>
              );
            }
          )}
        </div>
      </fieldset>

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Ton rythme naturel
        </label>
        <div className="space-y-2">
          {RYTHME.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update("rythme", value)}
              className={`block w-full rounded-lg px-4 py-3 text-left text-sm transition ${
                answers.rythme === value
                  ? "border-2 border-[#A55734] bg-[#FFF2EB]/50"
                  : "border border-[#A55734]/30 bg-white hover:border-[#A55734]/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Budget
        </label>
        <div className="flex flex-wrap gap-2">
          {BUDGET.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update("budget", value)}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                answers.budget === value
                  ? "bg-[#A55734] text-white"
                  : "border border-[#A55734]/30 bg-white text-[#333333] hover:border-[#A55734]/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Incontournables vs pépites
        </label>
        <div className="space-y-2">
          {INCONTOURNABLES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update("incontournablesVsPepites", value)}
              className={`block w-full rounded-lg px-4 py-3 text-left text-sm transition ${
                answers.incontournablesVsPepites === value
                  ? "border-2 border-[#A55734] bg-[#FFF2EB]/50"
                  : "border border-[#A55734]/30 bg-white hover:border-[#A55734]/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#A55734] px-6 py-3 font-medium text-white transition hover:bg-[#8b4728] disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer mes réponses"}
        </button>
      </div>
    </form>
  );
}
