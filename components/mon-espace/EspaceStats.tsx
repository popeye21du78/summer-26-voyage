"use client";

import { BarChart3, Route, Wallet, Clock, Award, Users } from "lucide-react";
import type { VoyageStateResponse } from "@/types/voyage-state";

type Props = {
  state: VoyageStateResponse | null;
  profileName: string;
};

export default function EspaceStats({ state, profileName }: Props) {
  const termines = state?.voyagesTermines ?? [];
  const totalKm = termines.reduce((a, v) => a + (v.stats?.km ?? 0), 0);
  const totalBudget = termines.reduce((a, v) => a + (v.stats?.budget ?? 0), 0);
  const avgDuration =
    termines.length > 0
      ? Math.round(termines.reduce((a, v) => a + v.dureeJours, 0) / termines.length)
      : 0;
  const totalVoyages =
    termines.length +
    (state?.voyageEnCours ? 1 : 0) +
    (state?.voyagesPrevus?.length ?? (state?.voyagePrevu ? 1 : 0));

  const stats = [
    { label: "Voyages", value: totalVoyages || "—", icon: Route },
    { label: "Kilomètres", value: totalKm > 0 ? `${totalKm}` : "—", icon: Route },
    { label: "Budget total", value: totalBudget > 0 ? `${totalBudget} €` : "—", icon: Wallet },
    { label: "Durée moyenne", value: avgDuration > 0 ? `${avgDuration} j` : "—", icon: Clock },
    { label: "Type voyageur", value: "Explorateur", icon: Award },
    { label: "Solo / Partagé", value: "Mixte", icon: Users },
  ];

  return (
    <section className="px-5 py-6">
      <h2 className="mb-4 flex items-center gap-2 font-courier text-sm font-bold uppercase tracking-wider text-[var(--color-accent-start)]">
        <BarChart3 className="h-4 w-4" />
        Stats & identité
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex flex-col items-center rounded-xl border border-white/6 bg-white/3 p-4 text-center"
            >
              <Icon className="mb-2 h-5 w-5 text-[var(--color-accent-start)]/40" />
              <dd className="font-courier text-lg font-bold text-[var(--color-accent-start)]">
                {s.value}
              </dd>
              <dt className="mt-0.5 font-courier text-[9px] font-bold uppercase tracking-wider text-white/35">
                {s.label}
              </dt>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-white/6 p-4 text-center">
        <Award className="mx-auto h-6 w-6 text-[var(--color-accent-start)]/20" />
        <p className="mt-1 font-courier text-[10px] text-white/25">
          Badges & récompenses — bientôt disponible
        </p>
      </div>
    </section>
  );
}
