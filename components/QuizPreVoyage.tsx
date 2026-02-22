"use client";

import { useState } from "react";
import type { QuizPreVoyageAnswers } from "../data/quiz-types";

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

const RYTHME = [
  { value: "cool", label: "Cool — on prend son temps" },
  { value: "normal", label: "Normal" },
  { value: "intense", label: "Intense — on enchaîne" },
] as const;

const ACTIVITES = [
  { value: "plages", label: "Plages" },
  { value: "randos", label: "Randos" },
  { value: "villages", label: "Villages" },
  { value: "patrimoine", label: "Patrimoine" },
  { value: "gastronomie", label: "Gastronomie" },
  { value: "musees", label: "Musées" },
] as const;

const MOOD = [
  { value: "contemplatif", label: "Contemplatif" },
  { value: "aventurier", label: "Aventurier" },
  { value: "gourmand", label: "Gourmand" },
  { value: "culturel", label: "Culturel" },
] as const;

const AVEC_QUI = [
  { value: "solo", label: "Solo" },
  { value: "couple", label: "Couple" },
  { value: "famille", label: "Famille" },
  { value: "amis", label: "Amis" },
] as const;

interface QuizPreVoyageProps {
  initialAnswers?: Partial<QuizPreVoyageAnswers>;
  onSubmit: (answers: QuizPreVoyageAnswers) => void;
  submitting?: boolean;
}

export default function QuizPreVoyage({
  initialAnswers = {},
  onSubmit,
  submitting = false,
}: QuizPreVoyageProps) {
  const [answers, setAnswers] = useState<Partial<QuizPreVoyageAnswers>>(
    initialAnswers
  );

  function update<K extends keyof QuizPreVoyageAnswers>(
    key: K,
    value: QuizPreVoyageAnswers[K]
  ) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function toggleActivite(val: (typeof ACTIVITES)[number]["value"]) {
    const current = (answers.activitesPrioritaires ?? []) as string[];
    const next = current.includes(val)
      ? current.filter((x) => x !== val)
      : [...current, val];
    update("activitesPrioritaires", next as QuizPreVoyageAnswers["activitesPrioritaires"]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(answers as QuizPreVoyageAnswers);
  }

  const hebergement = answers.hebergement ?? {
    airbnb: 33,
    camping: 33,
    vanSauvage: 34,
  };

  const hebergementLabels = {
    airbnb: "Airbnb",
    camping: "Camping",
    vanSauvage: "Van sauvage",
  } as const;

  function setHebergement(
    key: "airbnb" | "camping" | "vanSauvage",
    val: number
  ) {
    const next = { ...hebergement, [key]: Math.min(100, Math.max(0, val)) };
    update("hebergement", next);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Région
        </label>
        <select
          value={answers.region ?? "Peu importe"}
          onChange={(e) => update("region", e.target.value)}
          className="w-full rounded-lg border border-[#A55734]/30 bg-white px-4 py-3 text-[#333333] focus:border-[#A55734] focus:outline-none focus:ring-1 focus:ring-[#A55734]/30"
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Rythme pour ce voyage
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
          Activités prioritaires
        </label>
        <p className="mb-2 text-sm text-[#333333]/70">
          Sélectionne celles qui comptent pour ce voyage
        </p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleActivite(value)}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                (answers.activitesPrioritaires ?? []).includes(value)
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
          Mood
        </label>
        <div className="flex flex-wrap gap-2">
          {MOOD.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update("mood", value)}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                answers.mood === value
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

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Hébergement (% Airbnb / Camping / Van sauvage — total 100 %)
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["airbnb", "camping", "vanSauvage"] as const).map((key) => (
            <div key={key}>
              <span className="mb-2 block text-sm text-[#333333]">
                {hebergementLabels[key]}
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={hebergement[key] ?? 33}
                onChange={(e) =>
                  setHebergement(key, Math.min(100, Math.max(0, Number(e.target.value))))
                }
                className="w-full rounded-lg border border-[#A55734]/30 bg-white px-4 py-2 text-[#333333] focus:border-[#A55734] focus:outline-none"
              />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Durée (en jours)
        </label>
        <input
          type="number"
          min={1}
          max={90}
          value={answers.dureeJours ?? 7}
          onChange={(e) => update("dureeJours", Number(e.target.value))}
          className="w-full rounded-lg border border-[#A55734]/30 bg-white px-4 py-3 text-[#333333] focus:border-[#A55734] focus:outline-none focus:ring-1 focus:ring-[#A55734]/30"
        />
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

      <div className="pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[#A55734] px-6 py-3 font-medium text-white transition hover:bg-[#8b4728] disabled:opacity-50"
        >
          {submitting ? "En cours…" : "Valider et voir les propositions"}
        </button>
      </div>
    </form>
  );
}
