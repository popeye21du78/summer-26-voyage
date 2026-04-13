"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useMemo } from "react";
import { getVoyagesPartagesDemo } from "../../data/mock-shared-voyages";
import HomeDecorTitle from "./HomeDecorTitle";
import {
  SNAP_SECTION,
  SNAP_SECTION_SCROLL_INNER,
  HOME_LIST_CARD,
  HOME_LIST_MEDIA_BOX,
  HOME_SECTION_H2,
} from "./homeSectionTokens";

export default function HomeVoyagesPartagesSection({
  profileId,
}: {
  profileId: string;
}) {
  const items = useMemo(() => getVoyagesPartagesDemo(profileId), [profileId]);

  return (
    <section
      id="section-partages"
      className={`relative border-t border-[#E07856]/12 bg-gradient-to-b from-[#F3E8DD] to-[#EDDCCD] ${SNAP_SECTION}`}
      aria-labelledby="partages-titre"
    >
      <HomeDecorTitle lines={["À", "PLUSIEURS"]} tone="onLight" />
      <div
        className={`relative z-10 ${SNAP_SECTION_SCROLL_INNER} px-4 pb-6 pt-[calc(env(safe-area-inset-top,0px)+4.25rem)]`}
      >
        <h2
          id="partages-titre"
          className={`relative mb-3 max-w-[95%] text-[#2a211c] ${HOME_SECTION_H2}`}
        >
          Voyages partagés
        </h2>
        <p className="mb-6 font-courier text-[11px] text-[#4a3a32]/50">
          Co-édition (démo).
        </p>
        <ul className="space-y-3">
          {items.map((v) => (
            <li key={v.id}>
              <Link href={v.href} className={`${HOME_LIST_CARD} group`}>
                <div className={HOME_LIST_MEDIA_BOX}>
                  <Users className="h-6 w-6 text-[#A55734]" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-courier text-base font-bold text-[#2a211c]">
                    {v.titre}
                  </p>
                  <p className="font-courier text-[11px] text-[#4a3a32]/65">
                    {v.sousTitre}
                  </p>
                  <p className="mt-1.5 font-courier text-[10px] font-bold uppercase tracking-wider text-[#A55734]">
                    {v.avec} ·{" "}
                    {v.statut === "invitation" ? "Invitation" : "Co-édition"}
                  </p>
                </div>
                <span
                  className="self-center text-lg font-bold text-[#E07856] transition group-hover:translate-x-0.5"
                  aria-hidden
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
