"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { EDITORIAL_PROFILES, getProfileById } from "@/data/test-profiles";
import {
  collectPersonaVoyages,
  getVoyageForProfile,
} from "@/data/mock-voyages";
import { starItinerariesForEditorialProfile } from "@/content/inspiration/star-itineraries-editorial";
import { readReturnTo } from "@/lib/return-to";
import LinkWithReturn from "@/components/LinkWithReturn";
import AmiVoyageFlipCard from "@/components/inspirer/AmiVoyageFlipCard";

export default function ProfilPublicPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [returnBack, setReturnBack] = useState<string | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setReturnBack(readReturnTo(sp));
  }, []);

  const profile = useMemo(() => getProfileById(id), [id]);
  const isEditorial = useMemo(
    () => EDITORIAL_PROFILES.some((p) => p.id === id),
    [id]
  );
  const state = useMemo(() => (profile ? getVoyageForProfile(profile.id) : null), [profile]);

  const voyagesFull = useMemo(() => {
    if (!state) return [];
    return collectPersonaVoyages(state);
  }, [state]);

  const starPick = useMemo(
    () => (isEditorial ? starItinerariesForEditorialProfile(id) : []),
    [isEditorial, id]
  );

  const regionsCount = useMemo(() => {
    const set = new Set<string>();
    for (const v of voyagesFull) {
      if (v.region) set.add(v.region);
    }
    return set.size;
  }, [voyagesFull]);

  if (!profile) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center bg-[#111111] px-6">
        <p className="font-courier text-sm text-white/50">Profil introuvable.</p>
        <Link href="/mon-espace" className="mt-4 font-courier text-xs font-bold text-[#E07856]">
          Mon espace
        </Link>
      </main>
    );
  }

  const defaultBack = isEditorial ? "/inspirer?tab=stars" : "/mon-espace";

  return (
    <main className="min-h-full overflow-y-auto bg-[#111111] pb-20">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/6 bg-[#111111]/95 px-4 py-3 backdrop-blur-lg">
        <Link
          href={returnBack ?? defaultBack}
          className="flex items-center gap-1 font-courier text-xs font-bold text-[#E07856]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>

      <div className="px-5 pt-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#E07856] to-[#c94a4a] font-courier text-2xl font-bold text-white">
            {profile.name.charAt(0)}
          </div>
          <div>
            <h1 className="font-courier text-2xl font-bold text-white">{profile.name}</h1>
            <p className="mt-1 font-courier text-sm text-white/45">{profile.situationLabel}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="font-courier text-[9px] font-bold uppercase tracking-wider text-white/35">
              Voyages (démo)
            </p>
            <p className="mt-1 font-courier text-xl font-bold text-[#E07856]">{voyagesFull.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="font-courier text-[9px] font-bold uppercase tracking-wider text-white/35">
              Régions touchées
            </p>
            <p className="mt-1 font-courier text-xl font-bold text-white">{regionsCount || "—"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-1 col-span-2">
            <p className="font-courier text-[9px] font-bold uppercase tracking-wider text-white/35">
              Itinéraires Stars liés
            </p>
            <p className="mt-1 font-courier text-xl font-bold text-white">{starPick.length}</p>
          </div>
        </div>

        {isEditorial && starPick.length > 0 && (
          <>
            <h2 className="mt-10 font-courier text-xs font-bold uppercase tracking-wider text-[#E07856]">
              Une manière de voyager — itinéraires Stars
            </h2>
            <p className="mt-2 font-courier text-xs text-white/40">
              Chaque itinéraire éditorial t&apos;est attribué dans la sélection Stars (partage entre les
              trois profils).
            </p>
            <ul className="mt-4 space-y-2">
              {starPick.slice(0, 12).map((it) => (
                <li key={`${it.regionId}-${it.itinerarySlug}`}>
                  <LinkWithReturn
                    href={`/inspirer?tab=stars&region=${encodeURIComponent(it.regionId)}`}
                    className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 font-courier text-sm text-white/85 transition hover:border-[#E07856]/35"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#E07856]/70" />
                    <span>{it.tripTitle}</span>
                  </LinkWithReturn>
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className="mt-10 font-courier text-xs font-bold uppercase tracking-wider text-[#E07856]">
          Voyages
        </h2>
        <p className="mt-2 font-courier text-xs text-white/35">
          Carte retournée : aperçu seulement. Ouvre le Viago en lecture pour suivre le récit (pas
          d&apos;édition depuis cette vue).
        </p>
        <div className="mt-5 flex max-w-md flex-col gap-10">
          {voyagesFull.length === 0 ? (
            <p className="font-courier text-sm text-white/35">Aucun voyage à afficher.</p>
          ) : (
            voyagesFull.map((v) => (
              <AmiVoyageFlipCard
                key={v.id}
                profileId={profile.id}
                profileName={profile.name}
                voyage={v}
              />
            ))
          )}
        </div>

        <h2 className="mt-12 font-courier text-xs font-bold uppercase tracking-wider text-[#E07856]">
          Carte & lieux
        </h2>
        <div className="mt-4 flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#1a1a1a]">
          <p className="max-w-xs text-center font-courier text-xs text-white/35">
            Heatmap des étapes validées : à brancher (agrégation des coordonnées des voyages ci-dessus).
          </p>
        </div>
      </div>
    </main>
  );
}
