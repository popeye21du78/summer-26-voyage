"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Compass, Sparkles, MapPin, BookOpen } from "lucide-react";
import type { VoyageStateResponse } from "@/types/voyage-state";
import AccueilEditorialBlock from "./AccueilEditorialBlock";

type Props = {
  profileId: string;
  profileName: string;
};

export default function AccueilHub({ profileId, profileName }: Props) {
  const [state, setState] = useState<VoyageStateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/voyage-state")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center bg-[#0e0e0e]">
        <p className="voyage-loading-text text-sm uppercase tracking-widest">
          voyage voyage…
        </p>
      </main>
    );
  }

  return (
    <main className="relative flex h-full flex-col overflow-hidden bg-[#0e0e0e]">
      {/* Video background - B&W */}
      <div className="absolute inset-0">
        <video
          src="/A2.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover opacity-20"
          style={{ filter: "grayscale(100%)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between px-5 pb-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image
            src="/A1.png"
            alt="Viago"
            width={32}
            height={32}
            className="brightness-0 invert"
          />
          <span className="font-courier text-xs font-bold uppercase tracking-[0.45em] text-white/70">
            Viago
          </span>
        </div>

        <div className="flex-1" />

        <ContextualBlock
          state={state}
          profileId={profileId}
          profileName={profileName}
        />

        <div className="flex-1" />

        <AccueilEditorialBlock />
      </div>
    </main>
  );
}

function ContextualBlock({
  state,
  profileId,
  profileName,
}: {
  state: VoyageStateResponse | null;
  profileId: string;
  profileName: string;
}) {
  const etat = state?.etat ?? "rien";

  if (etat === "voyage_en_cours" && state?.voyageEnCours) {
    const v = state.voyageEnCours;
    const step = state.stepsDuJour?.[0];
    return (
      <div className="space-y-5">
        <p className="font-courier text-xs font-bold uppercase tracking-[0.4em] text-[#E07856]">
          En route
        </p>
        <h1 className="max-w-[95%] font-courier text-[2.2rem] font-bold leading-[0.96] tracking-tight text-white">
          {v.titre}
        </h1>
        {step && (
          <p className="flex items-center gap-2 font-courier text-sm text-white/70">
            <MapPin className="h-4 w-4 text-[#E07856]" />
            Aujourd&apos;hui : {step.nom}
          </p>
        )}
        <Link
          href={`/mon-espace/voyage/${v.id}`}
          className="btn-orange-glow inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-courier text-sm font-bold text-white"
        >
          <BookOpen className="h-4 w-4" />
          Reprendre mon voyage
        </Link>
      </div>
    );
  }

  if (etat === "voyage_prevu" && state?.voyagePrevu) {
    const v = state.voyagePrevu;
    const jours = state.joursRestants ?? 0;
    return (
      <div className="space-y-5">
        <p className="font-courier text-xs font-bold uppercase tracking-[0.4em] text-[#E07856]">
          Bientôt
        </p>
        <h1 className="max-w-[95%] font-courier text-[2.2rem] font-bold leading-[0.96] tracking-tight text-white">
          {v.titre}
        </h1>
        <p className="font-courier text-lg text-white/80">
          <span className="text-3xl font-bold text-[#E07856]">J-{jours}</span>
        </p>
        <Link
          href={`/mon-espace/voyage/${v.id}`}
          className="btn-orange-glow inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-courier text-sm font-bold text-white"
        >
          Préparer ce voyage
        </Link>
      </div>
    );
  }

  if (etat === "voyage_termine") {
    const recent =
      state?.joursDepuisFinDernierVoyage != null &&
      state.joursDepuisFinDernierVoyage <= 14;
    const v = state?.voyagesTermines?.[0];
    return (
      <div className="space-y-5">
        <p className="font-courier text-xs font-bold uppercase tracking-[0.4em] text-[#E07856]">
          {recent ? "Retour de voyage" : "Envie de repartir ?"}
        </p>
        <h1 className="max-w-[95%] font-courier text-[2.2rem] font-bold leading-[0.96] tracking-tight text-white">
          {recent && v
            ? `${v.titre} — ton récit t'attend.`
            : `${profileName}, la route appelle.`}
        </h1>
        <div className="flex flex-col gap-3">
          {recent && v && (
            <Link
              href={`/mon-espace/viago/${v.id}`}
              className="btn-orange-glow inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-courier text-sm font-bold text-white"
            >
              <BookOpen className="h-4 w-4" />
              Écrire mon Viago
            </Link>
          )}
          <Link
            href="/inspirer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-courier text-sm font-bold text-white backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10"
          >
            <Sparkles className="h-4 w-4" />
            Trouver l&apos;inspiration
          </Link>
        </div>
      </div>
    );
  }

  const isJulie = profileId === "julie";
  return (
    <div className="space-y-5">
      <Image
        src="/A1.png"
        alt=""
        width={40}
        height={40}
        className="opacity-60"
        style={{ filter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(-15deg) brightness(1.1)" }}
      />
      <h1 className="max-w-[95%] font-courier text-[2.5rem] font-bold leading-[0.96] tracking-tight text-white">
        {isJulie ? (
          <>
            Lance
            <br />
            ton premier
            <br />
            grand départ.
          </>
        ) : (
          <>
            La route
            <br />
            commence ici.
          </>
        )}
      </h1>
      <p className="max-w-[90%] font-courier text-sm leading-relaxed text-white/45">
        Carnet, carte, envies — sans file d&apos;attente.
      </p>
      <div className="flex flex-col gap-3">
        <Link
          href="/inspirer"
          className="btn-orange-glow inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-courier text-sm font-bold text-white"
        >
          <Sparkles className="h-4 w-4" />
          Explorer des idées
        </Link>
        <Link
          href="/preparer"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-courier text-sm font-bold text-white backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10"
        >
          <Compass className="h-4 w-4" />
          Commencer un voyage
        </Link>
      </div>
    </div>
  );
}
