"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import AmiVoyagePhotoStrip from "../AmiVoyagePhotoStrip";
import HomeDecorTitle from "./HomeDecorTitle";
import { SNAP_SECTION, SNAP_SECTION_SCROLL_INNER } from "./homeSectionTokens";

type AmiRow = {
  profileName: string;
  voyage: {
    id: string;
    titre: string;
    sousTitre: string;
    steps?: Array<{ id: string; nom: string; contenu_voyage?: { photos?: string[] } }>;
  };
  type: string;
};

/**
 * Voyages des amis — lecture seule, recherche conservée.
 */
export default function HomeVoyagesAmisSection({
  voyagesAmis,
}: {
  voyagesAmis: AmiRow[];
}) {
  const [searchAmi, setSearchAmi] = useState("");
  const filtered = voyagesAmis.filter(
    (va) =>
      !searchAmi ||
      va.profileName.toLowerCase().includes(searchAmi.toLowerCase()) ||
      va.voyage.titre?.toLowerCase().includes(searchAmi.toLowerCase())
  );

  return (
    <section
      id="section-amis"
      className={`relative border-t border-white/10 bg-gradient-to-b from-[#5D3A1A] via-[#6B4423] to-[#7a4d2e] ${SNAP_SECTION}`}
      aria-labelledby="amis-titre"
    >
      <HomeDecorTitle lines={["LES", "AUTRES"]} tone="onDark" />
      <div
        className={`relative z-10 mx-auto max-w-lg ${SNAP_SECTION_SCROLL_INNER} px-4 pb-6 pt-[calc(env(safe-area-inset-top,0px)+4.25rem)]`}
      >
        <h2
          id="amis-titre"
          className="relative mb-1 max-w-[90%] font-courier text-2xl font-bold uppercase tracking-wide text-white"
        >
          Voyages des amis
        </h2>
        <p className="mb-5 font-courier text-[11px] text-white/45">
          Lecture seule.
        </p>

        <div className="mb-4">
          <label className="mb-1.5 block font-courier text-[10px] font-bold uppercase tracking-[0.25em] text-white/55">
            Filtrer
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
            <input
              type="text"
              value={searchAmi}
              onChange={(e) => setSearchAmi(e.target.value)}
              placeholder="Nom ou voyage…"
              className="w-full rounded-xl border-2 border-white/25 bg-white/15 px-4 py-3 pl-10 font-courier text-sm text-white placeholder-white/45 backdrop-blur-sm focus:border-[var(--color-accent-start)] focus:outline-none"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <ul className="space-y-3">
            {filtered.map((va) => {
              const stepRefs =
                va.voyage.steps?.map((s) => ({ id: s.id, nom: s.nom })) ?? [];
              const amiRowKey = `${va.profileName}-${va.voyage.id}-${va.type}`;
              const hrefVoyage =
                va.type === "en_cours"
                  ? `/voyage/${va.voyage.id}/en-cours`
                  : va.type === "termine"
                    ? `/voyage/${va.voyage.id}/termine`
                    : `/voyage/${va.voyage.id}/prevu`;
              return (
                <li key={amiRowKey}>
                  <Link
                    href={hrefVoyage}
                    className="btn-terracotta flex flex-col overflow-hidden rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur-sm transition-all hover:border-[var(--color-accent-start)]/45 hover:bg-white/15 sm:flex-row"
                  >
                    <div className="min-w-0 flex-1 p-4">
                      {/* Nom du voyage → titre */}
                      <p className="font-title text-base font-bold text-white">
                        {va.voyage.titre}
                      </p>
                      <p className="font-courier text-sm text-white/80">
                        {va.profileName} · {va.voyage.sousTitre}
                      </p>
                      <span className="mt-2 inline-block rounded-full bg-[var(--color-accent-start)]/35 px-2 py-0.5 font-title text-xs font-bold uppercase tracking-wider text-white">
                        {va.type === "prevu"
                          ? "À venir"
                          : va.type === "en_cours"
                            ? "En cours"
                            : "Terminé"}
                      </span>
                    </div>
                    {stepRefs.length > 0 && (
                      <AmiVoyagePhotoStrip key={amiRowKey} steps={stepRefs} />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="font-courier text-sm text-white/70">
            {searchAmi
              ? "Aucun résultat."
              : "Aucun voyage d’ami pour le moment."}
          </p>
        )}
      </div>
    </section>
  );
}
