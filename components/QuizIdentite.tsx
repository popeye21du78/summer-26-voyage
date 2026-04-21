"use client";

import { useState } from "react";
import type { QuizIdentiteAnswers, AmateurHistoire, BudgetRestos } from "../data/quiz-types";

const AGE_TRANCHES = [
  { value: "18-25", label: "18-25 ans" },
  { value: "26-35", label: "26-35 ans" },
  { value: "36-50", label: "36-50 ans" },
  { value: "50+", label: "50 ans et +" },
] as const;

const AMATEUR_HISTOIRE: { value: AmateurHistoire; label: string }[] = [
  { value: "oui", label: "Oui, amateur" },
  { value: "non", label: "Non" },
];

const BUDGET_RESTOS: { value: BudgetRestos; label: string }[] = [
  { value: "rat", label: "Rat" },
  { value: "un_peu_de_budget", label: "Ça va, j'ai un peu de budget" },
];

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
          className="w-full rounded-lg border border-[var(--color-accent-end)]/30 bg-white px-4 py-3 text-[#333333] placeholder:text-[#999999] focus:border-[var(--color-accent-end)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-end)]/30"
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
                  ? "bg-[var(--color-accent-end)] text-white"
                  : "border border-[var(--color-accent-end)]/30 bg-white text-[#333333] hover:border-[var(--color-accent-end)]/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Tu voyages en van ?
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => update("possedeVan", true)}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              answers.possedeVan === true
                ? "bg-[var(--color-accent-end)] text-white"
                : "border border-[var(--color-accent-end)]/30 bg-white text-[#333333] hover:border-[var(--color-accent-end)]/50"
            }`}
          >
            Oui
          </button>
          <button
            type="button"
            onClick={() => update("possedeVan", false)}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              answers.possedeVan === false
                ? "bg-[var(--color-accent-end)] text-white"
                : "border border-[var(--color-accent-end)]/30 bg-white text-[#333333] hover:border-[var(--color-accent-end)]/50"
            }`}
          >
            Non
          </button>
        </div>
      </fieldset>

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Amateur en histoire ?
        </label>
        <p className="mb-3 text-sm text-[#333333]/70">
          Pour adapter les descriptions des villes.
        </p>
        <div className="flex flex-wrap gap-2">
          {AMATEUR_HISTOIRE.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update("amateurHistoire", value)}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                answers.amateurHistoire === value
                  ? "bg-[var(--color-accent-end)] text-white"
                  : "border border-[var(--color-accent-end)]/30 bg-white text-[#333333] hover:border-[var(--color-accent-end)]/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <label className="mb-2 block text-sm font-medium text-[#333333]">
          Budget restos
        </label>
        <p className="mb-3 text-sm text-[#333333]/70">
          Pour adapter les propositions de restos.
        </p>
        <div className="flex flex-wrap gap-2">
          {BUDGET_RESTOS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update("budgetRestos", value)}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                answers.budgetRestos === value
                  ? "bg-[var(--color-accent-end)] text-white"
                  : "border border-[var(--color-accent-end)]/30 bg-white text-[#333333] hover:border-[var(--color-accent-end)]/50"
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
          className="rounded-lg bg-[var(--color-accent-end)] px-6 py-3 font-medium text-white transition hover:bg-[var(--color-accent-deep)] disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer mes réponses"}
        </button>
      </div>
    </form>
  );
}
