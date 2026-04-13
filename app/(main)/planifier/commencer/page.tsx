"use client";

import Link from "next/link";
import {
  Sparkles,
  MapPinned,
  Route,
  MapPin,
  Search,
  Heart,
  ArrowLeft,
} from "lucide-react";
import LaissezVousTenterCarousel from "../../../../components/LaissezVousTenterCarousel";
import { VOYAGES_PREFAITS } from "../../../../data/mock-voyages";

/**
 * Hub intermédiaire « Commencer un voyage » : regroupe les workflows de préparation
 * (anciennement en façade sur l’accueil) + accès recherche / carte.
 */
export default function CommencerVoyagePage() {
  const voyagesCarousel = VOYAGES_PREFAITS.map((v) => ({
    id: v.id,
    titre: v.titre,
    dureeJours: v.dureeJours,
    steps: v.steps.map((s) => ({
      id: s.id,
      nom: s.nom,
      contenu_voyage: s.contenu_voyage,
    })),
  }));

  return (
    <main className="page-under-header mx-auto max-w-5xl px-4 py-8 pb-16">
      <Link
        href="/accueil#on-repart"
        className="mb-6 inline-flex items-center gap-2 font-courier text-sm font-bold text-[#A55734] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à l’accueil
      </Link>

      <h1 className="font-courier text-2xl font-bold text-[#333333] md:text-3xl">
        Commencer un voyage
      </h1>
      <p className="mt-2 max-w-2xl font-courier text-sm text-[#333333]/85">
        Choisis comment tu veux entrer dans la préparation : inspiration, zone,
        corridor, lieux — ou une recherche pour poser une première épingle.
      </p>

      {/* Recherche — ici, pas en hero d’accueil */}
      <section className="mt-8 rounded-2xl border-2 border-[#E07856]/25 bg-[#FFF8F0]/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Search className="h-6 w-6 shrink-0 text-[#E07856]" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-courier text-sm font-bold uppercase tracking-wider text-[#A55734]">
              Rechercher & placer sur la carte
            </h2>
            <p className="font-courier text-xs text-[#333333]/75">
              Ouvre une zone ou un lieu pour commencer à cadrer ton voyage.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Link
              href="/planifier/zone"
              className="rounded-full border-2 border-[#E07856]/50 bg-white px-4 py-2 font-courier text-xs font-bold text-[#A55734] transition hover:bg-[#FFF2EB]"
            >
              Par zone
            </Link>
            <Link
              href="/planifier/lieux"
              className="rounded-full border-2 border-[#E07856]/50 bg-white px-4 py-2 font-courier text-xs font-bold text-[#A55734] transition hover:bg-[#FFF2EB]"
            >
              Par lieux
            </Link>
          </div>
        </div>
      </section>

      <p className="mx-auto mb-6 mt-10 max-w-xl text-center font-courier text-base font-bold text-[#333333]">
        Comment veux-tu structurer ton voyage ?
      </p>

      <div className="mx-auto grid w-full grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
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
          <Link
            href="/planifier/favoris"
            className="group flex flex-col rounded-2xl border-2 border-[#A55734]/25 bg-white/60 p-4 text-left shadow-md transition hover:border-[#E07856]/50 sm:col-span-2"
          >
            <Heart className="mb-2 h-8 w-8 text-[#E07856]" aria-hidden />
            <span className="font-courier text-sm font-bold uppercase tracking-wide text-[#A55734]">
              Coups de cœur
            </span>
            <span className="mt-1 font-courier text-xs leading-relaxed text-[#333]/80">
              Reprendre des envies déjà sauvegardées.
            </span>
          </Link>
        </div>

        <div className="flex w-full max-w-md flex-col justify-start lg:mx-auto">
          <p className="mb-2 text-center font-courier text-xs font-bold uppercase tracking-wider text-[#A55734]/90 lg:text-left">
            Piste secondaire — voyages tout faits
          </p>
          <LaissezVousTenterCarousel voyages={voyagesCarousel} />
        </div>
      </div>

      <p className="mt-12 text-center font-courier text-xs text-[#333333]/65">
        Tous les parcours de préparation Viago restent accessibles depuis cet
        écran.
      </p>
    </main>
  );
}
