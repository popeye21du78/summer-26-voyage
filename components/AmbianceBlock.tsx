"use client";

import type { AmbiancesRepartition, NiveauAmbiance } from "@/data/quiz-types";

const NIVEAUX: { value: NiveauAmbiance; label: string }[] = [
  { value: "beaucoup", label: "Beaucoup" },
  { value: "un_peu", label: "Un peu" },
  { value: "passer", label: "Passer" },
];

const TYPES = [
  { key: "chateaux" as const, label: "Châteaux" },
  { key: "villages" as const, label: "Villages" },
  { key: "villes" as const, label: "Villes" },
  { key: "musees" as const, label: "Musées" },
  { key: "randos" as const, label: "Randos" },
  { key: "plages" as const, label: "Plages" },
];

interface AmbianceBlockProps {
  value?: AmbiancesRepartition;
  onChange: (value: AmbiancesRepartition) => void;
}

export default function AmbianceBlock({ value = {}, onChange }: AmbianceBlockProps) {
  function setAmbiance(
    key: keyof AmbiancesRepartition,
    niveau: NiveauAmbiance
  ) {
    onChange({ ...value, [key]: niveau });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#333333]/70">
        Pour chaque type d&apos;étape, indique ton envie : <strong>Beaucoup</strong> (35 %),
        <strong> Un peu</strong> (15 %) ou <strong>Passer</strong> (0 %). Les parts sont
        normalisées automatiquement.
      </p>
      <div className="space-y-3">
        {TYPES.map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-[#A55734]/20 bg-white/60 px-3 py-2"
          >
            <span className="min-w-[90px] text-sm font-medium text-[#333333]">
              {label}
            </span>
            <div className="flex gap-1">
              {NIVEAUX.map(({ value: v, label: l }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmbiance(key, v)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    (value[key] ?? "passer") === v
                      ? v === "beaucoup"
                        ? "bg-[#A55734] text-white"
                        : v === "un_peu"
                          ? "bg-[#A55734]/60 text-white"
                          : "bg-[#333333]/20 text-[#333333]/70"
                      : "bg-[#f5f5f5] text-[#333333]/60 hover:bg-[#FFF2EB]/50"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
