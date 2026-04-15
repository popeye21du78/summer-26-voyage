"use client";

import Link from "next/link";
import { User } from "lucide-react";
import type { VoyageStateResponse } from "@/types/voyage-state";
import HomeDecorTitle from "./HomeDecorTitle";
import {
  SNAP_SECTION,
  SNAP_SECTION_SCROLL_INNER,
  HOME_SECTION_H2,
} from "./homeSectionTokens";

function aggregateKmBudget(state: VoyageStateResponse | null): {
  voyagesCount: number;
  km: number;
  budget: number;
} {
  if (!state) return { voyagesCount: 0, km: 0, budget: 0 };
  const prevus =
    state.voyagesPrevus && state.voyagesPrevus.length > 0
      ? state.voyagesPrevus
      : state.voyagePrevu
        ? [state.voyagePrevu]
        : [];
  let n = prevus.length + (state.voyageEnCours ? 1 : 0);
  const term = state.voyagesTermines ?? [];
  n += term.length;
  let km = 0;
  let budget = 0;
  for (const v of term) {
    if (v.stats?.km) km += v.stats.km;
    if (v.stats?.budget) budget += v.stats.budget;
  }
  return { voyagesCount: n, km, budget };
}

/**
 * Synthèse personnelle — ton chaleureux, pas dashboard froid.
 */
export default function HomeProfilStatsSection({
  state,
  profileName,
}: {
  state: VoyageStateResponse | null;
  profileName?: string;
}) {
  const { voyagesCount, km, budget } = aggregateKmBudget(state);

  return (
    <section
      id="section-stats"
      className={`relative bg-gradient-to-b from-[#FFF9F4] to-[#111111] ${SNAP_SECTION}`}
      aria-labelledby="stats-titre"
    >
      <HomeDecorTitle lines={["TON", "ESPACE"]} tone="onLight" />
      <div
        className={`relative z-10 mx-auto max-w-lg ${SNAP_SECTION_SCROLL_INNER} px-4 pb-6 pt-[calc(env(safe-area-inset-top,0px)+4.25rem)]`}
      >
        <h2
          id="stats-titre"
          className={`relative mb-2 max-w-[95%] text-[#2a211c] ${HOME_SECTION_H2}`}
        >
          Ton espace
        </h2>
        <p className="mb-5 font-courier text-[11px] text-[#2a211c]/45">
          Démo.
        </p>

        <div className="rounded-2xl border border-[#E07856]/30 bg-white/95 p-5 shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E07856]/15 text-[#E07856]">
              <User className="h-5 w-5" />
            </span>
            <div>
              <p className="font-courier text-sm font-bold text-[#2a211c]">
                {profileName ?? "Voyageur"}
              </p>
              <Link
                href="/profil"
                className="font-courier text-xs font-bold text-[#E07856] underline"
              >
                Modifier ma perso →
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 border-t border-[#E07856]/15 pt-4 text-center">
            <div>
              <dt className="font-courier text-[10px] font-bold uppercase tracking-wider text-[#2a211c]/60">
                Voyages
              </dt>
              <dd className="font-courier text-2xl font-bold text-[#E07856]">
                {voyagesCount}
              </dd>
            </div>
            <div>
              <dt className="font-courier text-[10px] font-bold uppercase tracking-wider text-[#2a211c]/60">
                km (carnets clos)
              </dt>
              <dd className="font-courier text-2xl font-bold text-[#E07856]">
                {km > 0 ? km : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-courier text-[10px] font-bold uppercase tracking-wider text-[#2a211c]/60">
                Budget ref.
              </dt>
              <dd className="font-courier text-2xl font-bold text-[#E07856]">
                {budget > 0 ? `${budget} €` : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
