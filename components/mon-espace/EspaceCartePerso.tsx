"use client";

import { Map as MapIcon, MapPin } from "lucide-react";
import type { VoyageStateResponse } from "@/types/voyage-state";

type Props = { state: VoyageStateResponse | null };

export default function EspaceCartePerso({ state }: Props) {
  const termines = state?.voyagesTermines ?? [];
  const villes = new Set<string>();
  const regions = new Set<string>();

  for (const v of termines) {
    regions.add(v.region);
    for (const s of v.steps) {
      villes.add(s.nom);
    }
  }
  if (state?.voyageEnCours) {
    regions.add(state.voyageEnCours.region);
    for (const s of state.voyageEnCours.steps) {
      villes.add(s.nom);
    }
  }

  return (
    <section className="px-5 py-6">
      <h2 className="mb-4 flex items-center gap-2 font-courier text-sm font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
        <MapIcon className="h-4 w-4" />
        Ma carte
      </h2>

      <div className="relative overflow-hidden rounded-2xl border border-white/6 bg-white/3">
        <div className="flex h-48 items-center justify-center">
          <div className="text-center">
            <MapIcon className="mx-auto h-10 w-10 text-[var(--color-accent-start)]/20" />
            <p className="mt-2 font-courier text-xs text-white/35">
              {regions.size > 0
                ? `${regions.size} régions · ${villes.size} villes`
                : "Ta carte se remplira avec tes voyages."}
            </p>
          </div>
        </div>
      </div>

      {villes.size > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from(villes)
            .slice(0, 12)
            .map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-start)]/10 px-2.5 py-1 font-courier text-[10px] text-[var(--color-accent-start)]"
              >
                <MapPin className="h-2.5 w-2.5" />
                {v}
              </span>
            ))}
          {villes.size > 12 && (
            <span className="font-courier text-[10px] text-white/25">
              +{villes.size - 12} autres
            </span>
          )}
        </div>
      )}
    </section>
  );
}
