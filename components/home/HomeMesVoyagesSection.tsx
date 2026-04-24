"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import type { VoyageStateResponse } from "@/types/voyage-state";
import type { Voyage } from "../../data/mock-voyages";
import VoyageCoverThumb from "../VoyageCoverThumb";
import HomeDecorTitle from "./HomeDecorTitle";
import {
  SNAP_SECTION,
  SNAP_SECTION_SCROLL_INNER,
  HOME_LIST_CARD_ON_DARK,
  HOME_SECTION_H2,
} from "./homeSectionTokens";

function voyagesFromState(state: VoyageStateResponse | null): Array<{
  id: string;
  titre: string;
  sousTitre: string;
  href: string;
  type: "prevu" | "en_cours" | "termine";
  voyage: Voyage;
}> {
  if (!state) return [];
  const out: Array<{
    id: string;
    titre: string;
    sousTitre: string;
    href: string;
    type: "prevu" | "en_cours" | "termine";
    voyage: Voyage;
  }> = [];

  const prevus =
    state.voyagesPrevus && state.voyagesPrevus.length > 0
      ? state.voyagesPrevus
      : state.voyagePrevu
        ? [state.voyagePrevu]
        : [];
  for (const v of prevus) {
    out.push({
      id: v.id,
      titre: v.titre,
      sousTitre: v.sousTitre,
      href: `/mon-espace/voyage/${v.id}`,
      type: "prevu",
      voyage: v,
    });
  }
  if (state.voyageEnCours) {
    out.push({
      id: state.voyageEnCours.id,
      titre: state.voyageEnCours.titre,
      sousTitre: state.voyageEnCours.sousTitre,
      href: `/mon-espace/voyage/${state.voyageEnCours.id}`,
      type: "en_cours",
      voyage: state.voyageEnCours,
    });
  }
  if (state.voyagesTermines?.length) {
    state.voyagesTermines.forEach((v) => {
      out.push({
        id: v.id,
        titre: v.titre,
        sousTitre: v.sousTitre,
        href: `/mon-espace/voyage/${v.id}`,
        type: "termine",
        voyage: v,
      });
    });
  }
  return out;
}

const labels = {
  prevu: "À venir",
  en_cours: "En cours",
  termine: "Passés",
} as const;

type MesVoyageRow = ReturnType<typeof voyagesFromState>[number];

function MesVoyagesSubBlock({
  title,
  items,
}: {
  title: string;
  items: MesVoyageRow[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-5 last:mb-0">
      {/*
       * Sous-titre de groupe (« À venir », « En cours », « Passés »)
       * → police titre.
       */}
      <h3 className="mb-2 font-title text-xs font-bold uppercase tracking-[0.3em] text-[#F5C4B8]">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((v) => (
          <li key={v.id + v.type}>
            <Link
              href={v.href}
              className={`${HOME_LIST_CARD_ON_DARK} font-courier`}
            >
              <VoyageCoverThumb
                voyage={v.voyage}
                className="h-[3.25rem] w-[3.25rem] shrink-0 rounded-xl object-cover shadow-inner ring-1 ring-white/30"
              />
              <div className="min-w-0 flex-1">
                <span className="font-title text-[10px] font-bold uppercase tracking-wider text-[#FFD4C8]">
                  {labels[v.type]}
                </span>
                {/* Nom du voyage (home) → police titre */}
                <p className="truncate font-title text-base font-bold text-[#FFFBF7]">
                  {v.titre}
                </p>
                <p className="truncate font-courier text-[11px] text-[#FAF4F0]/65">
                  {v.sousTitre}
                </p>
              </div>
              <span className="self-center text-lg font-bold text-[#F5C4B8]">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomeMesVoyagesSection({
  state,
}: {
  state: VoyageStateResponse | null;
}) {
  const all = voyagesFromState(state);
  const prevus = all.filter((x) => x.type === "prevu");
  const encours = all.filter((x) => x.type === "en_cours");
  const passes = all.filter((x) => x.type === "termine");

  return (
    <section
      id="section-mes-voyages"
      className={`relative scroll-mt-0 border-t border-white/10 bg-gradient-to-br from-[#8B4A3C] via-[#6B3830] to-[#4f2c26] ${SNAP_SECTION}`}
      aria-labelledby="mes-voyages-titre"
    >
      <HomeDecorTitle lines={["MES", "TRAJETS"]} tone="onDark" />
      <div
        className={`relative z-10 ${SNAP_SECTION_SCROLL_INNER} px-4 pb-6 pt-[calc(env(safe-area-inset-top,0px)+4.25rem)]`}
      >
        <h2
          id="mes-voyages-titre"
          className={`relative mb-2 max-w-[95%] text-[#FFFBF7] ${HOME_SECTION_H2}`}
        >
          Mes voyages
        </h2>
        <p className="mb-6 font-courier text-[11px] text-[#FAF4F0]/55">
          Tes carnets — distinct du fil social.
        </p>

        {all.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/35 bg-white/10 p-6 backdrop-blur-md">
            <Calendar className="mb-3 h-9 w-9 text-[#F5C4B8]/55" />
            <p className="font-courier text-sm text-[#FFFBF7]/85">
              Pas encore de voyage enregistré.
            </p>
            <Link
              href="/planifier/commencer"
              className="btn-terracotta mt-4 inline-flex rounded-2xl border-2 border-[#F5C4B8]/50 bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-mid)] px-5 py-2.5 font-courier text-sm font-bold text-white shadow-md"
            >
              Commencer un voyage
            </Link>
          </div>
        ) : (
          <>
            <MesVoyagesSubBlock title="Prévus & bientôt" items={prevus} />
            <MesVoyagesSubBlock title="En cours" items={encours} />
            <MesVoyagesSubBlock title="Passés" items={passes} />
            <Link
              href="/mes-voyages"
              className="mt-3 inline-block font-courier text-xs font-bold text-[#F5C4B8] underline decoration-[#F5C4B8]/50 underline-offset-2 hover:text-white"
            >
              Tout l’historique →
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
