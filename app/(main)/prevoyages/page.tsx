"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, Calendar } from "lucide-react";
import { VOYAGES_PREFAITS } from "../../../data/mock-voyages";

export default function PreVoyagesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 pt-16">
      <Link
        href="/accueil"
        className="mb-6 inline-flex items-center gap-2 font-courier text-sm font-bold text-[#E07856] transition hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <h1 className="mb-2 font-courier text-2xl font-bold tracking-wider text-[#333333]">
        Laissez-vous tenter
      </h1>
      <p className="mb-10 font-courier text-sm text-[#333333]/70">
        Des itinéraires prêts à l&apos;emploi, avec durée et région. Cliquez pour
        choisir le nombre de jours.
      </p>

      <div className="space-y-6">
        {VOYAGES_PREFAITS.map((v) => (
          <Link
            key={v.id}
            href={`/voyage/nouveau?prevoyage=${v.id}`}
            className="block overflow-hidden rounded-xl border border-[#E07856]/20 bg-white transition-all duration-300 hover:scale-[1.01] hover:border-[#E07856]/40 hover:shadow-lg"
          >
            <div
              className="aspect-video bg-cover bg-center"
              style={{
                backgroundImage: v.steps[0]?.contenu_voyage?.photos?.[0]
                  ? `url(${v.steps[0].contenu_voyage.photos[0]})`
                  : "linear-gradient(135deg, #E07856 0%, #D4635B 100%)",
              }}
            />
            <div className="p-6">
              <h2 className="font-courier text-xl font-bold text-[#333333]">
                {v.titre}
              </h2>
              <p className="mt-1 font-courier text-sm text-[#333333]/70">{v.sousTitre}</p>
              <div className="mt-4 flex flex-wrap gap-4 font-courier text-sm text-[#E07856]">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {v.region}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {v.dureeJours} jours
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
