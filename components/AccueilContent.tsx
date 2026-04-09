"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  UserCog,
  Share2,
  Calendar,
  ChevronDown,
  Search,
  Sparkles,
  MapPinned,
  Route,
  MapPin,
} from "lucide-react";
import VoyagePrevuCountdown from "./VoyagePrevuCountdown";
import VoyageEnCoursLanding from "./VoyageEnCoursLanding";
import VoyageTermineLanding from "./VoyageTermineLanding";
import HeroPhotoStripResolved from "./HeroPhotoStripResolved";
import LaissezVousTenterCarousel from "./LaissezVousTenterCarousel";
import AmiVoyagePhotoStrip from "./AmiVoyagePhotoStrip";
import PhilosophieCylindre from "./PhilosophieCylindre";
import type { VoyageStateResponse } from "@/types/voyage-state";
import { VOYAGES_PREFAITS, HERO_ACCUEIL_STEP_REFS } from "../data/mock-voyages";

export default function AccueilContent({
  profileName,
}: {
  profileName?: string;
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
  const [searchAmi, setSearchAmi] = useState("");

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

  const etat = state?.etat ?? "rien";
  const filteredAmis = voyagesAmis.filter(
    (va) =>
      !searchAmi ||
      va.profileName.toLowerCase().includes(searchAmi.toLowerCase()) ||
      va.voyage.titre?.toLowerCase().includes(searchAmi.toLowerCase())
  );

  return (
    <main className="h-screen snap-y snap-mandatory overflow-y-auto">
      {/* Hero */}
      {etat === "voyage_prevu" &&
        state?.voyagePrevu &&
        state.joursRestants != null && (
          <div id="hero-section" className="min-h-screen snap-start snap-always">
            <VoyagePrevuCountdown
              voyage={state.voyagePrevu}
              joursRestants={state.joursRestants}
            />
          </div>
        )}

      {etat === "voyage_en_cours" && state?.voyageEnCours && (
        <div id="hero-section" className="min-h-screen snap-start snap-always">
          <VoyageEnCoursLanding state={state} />
        </div>
      )}

      {etat === "voyage_termine" &&
        state?.voyagesTermines?.[0] &&
        (state.joursDepuisFinDernierVoyage ?? 99) <= 14 && (
          <div id="hero-section" className="min-h-screen snap-start snap-always">
            <VoyageTermineLanding state={state} />
          </div>
        )}

      {((etat === "rien") ||
        (etat === "voyage_termine" &&
          (state?.joursDepuisFinDernierVoyage ?? 99) > 14)) && (
        <div
          id="hero-section"
          className="relative flex min-h-screen snap-start snap-always flex-col overflow-hidden"
        >
          <HeroPhotoStripResolved steps={HERO_ACCUEIL_STEP_REFS} />
          <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 pt-16">
            <p className="mb-3 font-courier text-xl font-bold uppercase tracking-[0.3em] text-white/90 md:text-2xl">
              VAN TRIP
            </p>
            <h1
              className="mb-6 font-courier text-3xl font-bold tracking-wider text-transparent md:text-5xl"
              style={{
                background:
                  "linear-gradient(to right, #E07856, #D4635B, #CD853F)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
              }}
            >
              EN FRANCE
            </h1>
            <button
              type="button"
              onClick={() =>
                document.getElementById("philosophie-section")?.scrollIntoView({
                  behavior: "smooth",
                })
              }
              className="flex flex-col items-center gap-2 font-courier text-sm font-bold text-white/90 transition-all duration-300 hover:scale-110"
            >
              <span>Découvrir</span>
              <ChevronDown className="h-6 w-6 animate-bounce" />
            </button>
          </div>
        </div>
      )}

      {/* Profil discret — intégré en overlay ou barre fine */}
      <div className="fixed right-4 top-12 z-50 flex items-center gap-2">
        {profileName && (
          <span className="font-courier text-xs text-white/80 drop-shadow-md">
            {profileName}
          </span>
        )}
        <Link
          href="/profil"
          className="rounded-full bg-white/20 p-1.5 font-courier text-white/90 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white/30"
          title="Modifier ma perso"
        >
          <UserCog className="h-4 w-4" />
        </Link>
      </div>

      {/* Section Philosophie — fond terracotta foncé, titre bien séparé */}
      <section
        id="philosophie-section"
        className="flex min-h-screen snap-start snap-always flex-col items-center justify-center bg-gradient-to-br from-[#5D3A1A] via-[#8B4513] to-[#A0522D] px-4 pt-20 pb-16"
      >
        <div className="mb-6 text-center">
          <h2 className="font-courier text-2xl font-bold tracking-wider text-white md:text-3xl">
            NOTRE PHILOSOPHIE
          </h2>
          <div className="mx-auto mt-3 h-1 w-48 rounded-full bg-gradient-to-r from-transparent via-[#E07856] to-transparent" />
        </div>
        <div className="flex w-full max-w-5xl justify-center">
          <PhilosophieCylindre />
        </div>
        <button
          type="button"
          onClick={() =>
            document.getElementById("on-repart")?.scrollIntoView({
              behavior: "smooth",
            })
          }
          className="mt-8 flex flex-col items-center gap-2 font-courier text-white/90 transition-all duration-300 hover:scale-110"
        >
          <ChevronDown className="h-6 w-6 animate-bounce" />
        </button>
      </section>

      {/* Section Planifier un voyage (id on-repart conservé pour le header / ancres) */}
      <section
        id="on-repart"
        className="flex min-h-screen snap-start snap-always flex-col items-center justify-center bg-gradient-to-br from-[#FFF8F0] to-[#F5E6D3] px-4 pb-12 pt-20 sm:pb-16 sm:pt-24"
      >
        <div className="mb-10 w-full max-w-5xl text-center">
          <h2
            className="font-courier text-2xl font-bold tracking-wider md:text-3xl"
            style={{
              background: "linear-gradient(to right, #E07856, #D4635B, #CD853F)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            PLANIFIER UN VOYAGE
          </h2>
          <div className="mx-auto mt-3 h-1 w-48 rounded-full bg-gradient-to-r from-transparent via-[#E07856] to-transparent" />
        </div>

        <p className="mx-auto mb-8 max-w-xl text-center font-courier text-base font-bold text-[#333333]">
          Comment veux-tu commencer ?
        </p>

        {/* 4 portes + piste secondaire (voyages tout faits) */}
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/planifier/inspiration"
              className="group flex flex-col rounded-2xl border-2 border-[#E07856]/40 bg-white/90 p-4 text-left shadow-md transition hover:border-[#E07856] hover:shadow-lg"
            >
              <Sparkles className="mb-2 h-8 w-8 text-[#E07856]" aria-hidden />
              <span className="font-courier text-sm font-bold uppercase tracking-wide text-[#A55734]">
                Trouver l&apos;inspiration
              </span>
              <span className="mt-1 font-courier text-xs leading-relaxed text-[#333]/80">
                Carte de territoires éditoriaux pour faire émerger des envies.
              </span>
            </Link>
            <Link
              href="/planifier/zone"
              className="group flex flex-col rounded-2xl border-2 border-[#E07856]/40 bg-white/90 p-4 text-left shadow-md transition hover:border-[#E07856] hover:shadow-lg"
            >
              <MapPinned className="mb-2 h-8 w-8 text-[#E07856]" aria-hidden />
              <span className="font-courier text-sm font-bold uppercase tracking-wide text-[#A55734]">
                Créer dans une zone
              </span>
              <span className="mt-1 font-courier text-xs leading-relaxed text-[#333]/80">
                Région ou zone : cadrage, forme du voyage, structures de nuits.
              </span>
            </Link>
            <Link
              href="/planifier/axe"
              className="group flex flex-col rounded-2xl border-2 border-[#E07856]/40 bg-white/90 p-4 text-left shadow-md transition hover:border-[#E07856] hover:shadow-lg"
            >
              <Route className="mb-2 h-8 w-8 text-[#E07856]" aria-hidden />
              <span className="font-courier text-sm font-bold uppercase tracking-wide text-[#A55734]">
                Départ → arrivée
              </span>
              <span className="mt-1 font-courier text-xs leading-relaxed text-[#333]/80">
                Corridor, tendance du parcours, nuits puis enrichissements.
              </span>
            </Link>
            <Link
              href="/planifier/lieux"
              className="group flex flex-col rounded-2xl border-2 border-[#E07856]/40 bg-white/90 p-4 text-left shadow-md transition hover:border-[#E07856] hover:shadow-lg"
            >
              <MapPin className="mb-2 h-8 w-8 text-[#E07856]" aria-hidden />
              <span className="font-courier text-sm font-bold uppercase tracking-wide text-[#A55734]">
                Autour de lieux choisis
              </span>
              <span className="mt-1 font-courier text-xs leading-relaxed text-[#333]/80">
                Lieux indispensables ou bonus, diagnostic et options.
              </span>
            </Link>
          </div>

          <div className="flex w-full max-w-md flex-col justify-start lg:mx-auto">
            <p className="mb-2 text-center font-courier text-xs font-bold uppercase tracking-wider text-[#A55734]/90 lg:text-left">
              Piste secondaire — voyages tout faits
            </p>
            <LaissezVousTenterCarousel
              voyages={VOYAGES_PREFAITS.map((v) => ({
                id: v.id,
                titre: v.titre,
                dureeJours: v.dureeJours,
                steps: v.steps.map((s) => ({
                  id: s.id,
                  nom: s.nom,
                  contenu_voyage: s.contenu_voyage,
                })),
              }))}
            />
          </div>
        </div>
      </section>

      {/* Section Social — style Prêt à partir (fond foncé), pt pour bandeau */}
      <section
        id="social-section"
        className="flex min-h-screen snap-start snap-always flex-col justify-center bg-gradient-to-br from-[#5D3A1A] via-[#8B4513] to-[#A0522D] px-4 pt-16 pb-16"
      >
        <div className="mx-auto w-full max-w-2xl">
          <h2 className="mb-2 text-center font-courier text-2xl font-bold tracking-wider text-white md:text-3xl">
            CÔTÉ SOCIAL
          </h2>
          <div className="mx-auto mb-6 h-1 w-48 rounded-full bg-gradient-to-r from-transparent via-[#E07856] to-transparent" />

          <div className="mb-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-terracotta flex items-center gap-2 rounded-[50px] border-2 border-white/40 bg-white/10 px-4 py-2 font-courier text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white/20"
            >
              <Share2 className="h-4 w-4" />
              Partager mon voyage
            </button>
            <Link
              href="/mes-voyages"
              className="btn-terracotta flex items-center gap-2 rounded-[50px] border-2 border-white/40 bg-white/10 px-4 py-2 font-courier text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white/20"
            >
              <Calendar className="h-4 w-4" />
              Mes voyages
            </Link>
          </div>

          {/* Rechercher un ami */}
          <div className="mb-5">
            <label className="mb-2 block font-courier text-sm font-bold text-white/90">
              Rechercher un ami
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
              <input
                type="text"
                value={searchAmi}
                onChange={(e) => setSearchAmi(e.target.value)}
                placeholder="Nom ou voyage..."
                className="w-full rounded-xl border-2 border-white/30 bg-white/20 px-4 py-3 pl-10 font-courier text-white placeholder-white/50 backdrop-blur-sm focus:border-[#E07856] focus:outline-none"
              />
            </div>
          </div>

          {/* Liste des voyages des amis — avec photos défilantes à droite */}
          <div>
            <h3 className="mb-4 font-courier text-lg font-bold text-white">
              Voyages de mes amis
            </h3>
            {filteredAmis.length > 0 ? (
              <ul className="space-y-3">
                {filteredAmis.map((va) => {
                  const stepRefs =
                    va.voyage.steps?.map((s) => ({ id: s.id, nom: s.nom })) ?? [];
                  const amiRowKey = `${va.profileName}-${va.voyage.id}-${va.type}`;
                  return (
                    <li key={amiRowKey}>
                      <Link
                        href={`/voyage/${va.voyage.id}/prevu`}
                        className="btn-terracotta flex flex-col overflow-hidden rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-[#E07856]/50 hover:bg-white/15 sm:flex-row"
                      >
                        <div className="min-w-0 flex-1 p-4">
                          <p className="font-courier text-sm font-bold text-white">
                            {va.voyage.titre}
                          </p>
                          <p className="font-courier text-sm text-white/80">
                            {va.profileName} · {va.voyage.sousTitre}
                          </p>
                          <span className="mt-2 inline-block rounded-full bg-[#E07856]/30 px-2 py-0.5 font-courier text-xs font-bold text-white">
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
              <p className="font-courier text-white/70">
                {searchAmi
                  ? "Aucun ami ou voyage ne correspond."
                  : "Aucun voyage d'ami pour le moment."}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
