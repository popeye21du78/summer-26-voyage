"use client";

import { useState, useEffect } from "react";
import type { VoyageStateResponse } from "@/types/voyage-state";
import AccueilHeroRouter from "./home/AccueilHeroRouter";
import HomePorteEntree from "./home/HomePorteEntree";
import HomeInspirationSection from "./home/HomeInspirationSection";
import HomeMesVoyagesSection from "./home/HomeMesVoyagesSection";
import HomeVoyagesPartagesSection from "./home/HomeVoyagesPartagesSection";
import HomeVoyagesAmisSection from "./home/HomeVoyagesAmisSection";
import HomeProfilStatsSection from "./home/HomeProfilStatsSection";
import HomeMarqueFooter from "./home/HomeMarqueFooter";
import HomeMotCreateur from "./home/HomeMotCreateur";
import { SNAP_MAIN } from "./home/homeSectionTokens";

/**
 * Accueil connecté — structure en blocs (mobile-first) : hero contextuel,
 * porte d’entrée, inspiration, mes voyages, partages, amis, synthèse perso, marque.
 */
export default function AccueilContent({
  profileName,
  profileId = "",
}: {
  profileName?: string;
  profileId?: string;
}) {
  const [state, setState] = useState<VoyageStateResponse | null>(null);
  const [voyagesAmis, setVoyagesAmis] = useState<
    Array<{
      profileName: string;
      voyage: {
        id: string;
        titre: string;
        sousTitre: string;
        steps?: Array<{
          id: string;
          nom: string;
          contenu_voyage?: { photos?: string[] };
        }>;
      };
      type: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/voyage-state").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/voyages-amis").then((r) =>
        r.ok ? r.json() : { voyages: [] }
      ),
    ])
      .then(([voyageData, amisData]) => {
        setState(voyageData);
        setVoyagesAmis(
          (amisData?.voyages ?? []).map(
            (v: {
              profileName?: string;
              voyage?: {
                id: string;
                titre: string;
                sousTitre: string;
                steps?: Array<{
                  id: string;
                  nom: string;
                  contenu_voyage?: { photos?: string[] };
                }>;
              };
              type?: string;
            }) => ({
              profileName: v.profileName ?? "",
              voyage: v.voyage ?? {
                id: "",
                titre: "",
                sousTitre: "",
              },
              type: v.type ?? "",
            })
          )
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="font-courier text-[#333333]/70">Chargement…</p>
      </main>
    );
  }

  return (
    <main
      className={`relative bg-gradient-to-b from-[#3d2618] via-[#2a1810] to-[#1a120d] ${SNAP_MAIN}`}
    >
      <AccueilHeroRouter state={state} profileId={profileId} />

      <HomePorteEntree />
      <HomeInspirationSection />
      <HomeMesVoyagesSection state={state} />
      <HomeVoyagesPartagesSection profileId={profileId} />
      <HomeVoyagesAmisSection voyagesAmis={voyagesAmis} />
      <HomeProfilStatsSection state={state} profileName={profileName} />
      <HomeMotCreateur />
      <HomeMarqueFooter />
    </main>
  );
}
