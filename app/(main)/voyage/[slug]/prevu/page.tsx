"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MapPin, Fuel, Route, User, ChevronDown } from "lucide-react";
import VoyageStepsMap from "../../../../../components/VoyageStepsMap";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function VoyagePrevuPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<{
    voyage: any;
    isOwner: boolean;
    ownerName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetch(`/api/voyage/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const { isOwner, ownerName, ownerProfileId, ...voyage } = data;
          setData({ voyage, isOwner: isOwner ?? true, ownerName });
          setShowDetails(data.isOwner);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="font-courier text-[#333333]/70">Chargement…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <p className="font-courier text-[#333333]/80">Voyage introuvable.</p>
        <Link
          href="/accueil"
          className="font-courier font-bold text-[#E07856] underline transition hover:no-underline"
        >
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  const { voyage, isOwner, ownerName } = data;

  if (!isOwner && !showDetails) {
    return (
      <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#E07856] to-[#D4635B] text-4xl text-white">
              <User className="h-12 w-12" />
            </div>
          </div>
          <h1 className="mb-2 font-courier text-2xl font-bold tracking-wider text-[#333333] md:text-3xl">
            Voyage de {ownerName}
          </h1>
          <p className="mb-6 font-courier text-lg font-bold text-[#E07856]">
            {voyage.titre}
          </p>
          <p className="mb-8 font-courier text-[#333333]/80">
            Vous consultez le voyage d&apos;un ami. Lecture seule — pas de
            modification possible.
          </p>
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="btn-terracotta inline-flex items-center gap-2 rounded-[50px] border-2 border-[#E07856] bg-gradient-to-r from-[#E07856] to-[#D4635B] px-8 py-4 font-courier font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[#E07856]/50"
          >
            Voir le voyage
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 pt-16">
      <Link
        href="/accueil"
        className="mb-6 inline-flex font-courier text-sm font-bold text-[#E07856] transition-all duration-300 hover:scale-105 hover:underline"
      >
        ← Retour à l&apos;accueil
      </Link>

      {!isOwner && ownerName && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#E07856]/20 bg-white/60 px-4 py-3">
          <User className="h-5 w-5 text-[#E07856]" />
          <p className="font-courier text-sm text-[#333333]">
            Voyage de <strong>{ownerName}</strong> — lecture seule
          </p>
        </div>
      )}

      <h1 className="mb-2 font-courier text-2xl font-bold tracking-wider text-[#333333] md:text-3xl">
        {voyage.titre}
      </h1>
      <p className="mb-6 font-courier text-sm text-[#333333]/70">{voyage.sousTitre}</p>

      <div className="mb-8">
        <VoyageStepsMap
          steps={voyage.steps}
          mapboxAccessToken={token}
          linkToVille={isOwner}
          height={350}
        />
      </div>

      <ul className="mb-8 space-y-3">
        {voyage.steps.map((s: any, i: number) => {
          const photo = s.contenu_voyage?.photos?.[0];
          return (
            <li key={s.id}>
              <Link
                href={isOwner ? `/ville/${s.id}` : "#"}
                className={`group flex items-center gap-4 overflow-hidden rounded-xl border border-[#E07856]/15 bg-white/80 p-0 shadow-sm transition-all ${
                  isOwner ? "hover:border-[#E07856]/40 hover:shadow-lg" : "cursor-default"
                }`}
              >
                <div
                  className="h-20 w-24 shrink-0 bg-cover bg-center transition-transform group-hover:scale-105"
                  style={{
                    backgroundImage: photo
                      ? `url(${photo})`
                      : "linear-gradient(135deg, #E07856 0%, #D4635B 100%)",
                  }}
                />
                <div className="min-w-0 flex-1 py-3 pr-4">
                  <span className="mb-1 inline-block rounded-full bg-[#E07856]/15 px-2.5 py-0.5 font-courier text-xs font-bold text-[#E07856]">
                    Étape {i + 1}
                  </span>
                  <p className="font-courier font-bold text-[#333333]">{s.nom}</p>
                  <p className="font-courier text-sm text-[#333333]/60">
                    {formatDate(s.date_prevue)}
                  </p>
                </div>
                {isOwner && (
                  <MapPin className="mr-4 h-5 w-5 shrink-0 text-[#E07856]/60 transition group-hover:text-[#E07856]" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {voyage.stats && (
        <div className="mb-8 grid grid-cols-3 gap-4">
          {voyage.stats.km != null && (
            <div className="rounded-xl border border-[#E07856]/20 bg-white/60 p-4 text-center">
              <Route className="mx-auto mb-1 h-5 w-5 text-[#E07856]" />
              <p className="font-courier text-2xl font-bold text-[#333333]">
                {voyage.stats.km}
              </p>
              <p className="font-courier text-xs text-[#333333]/60">km prévus</p>
            </div>
          )}
          {voyage.stats.essence != null && (
            <div className="rounded-xl border border-[#E07856]/20 bg-white/60 p-4 text-center">
              <Fuel className="mx-auto mb-1 h-5 w-5 text-[#E07856]" />
              <p className="font-courier text-2xl font-bold text-[#333333]">
                {voyage.stats.essence}
              </p>
              <p className="font-courier text-xs text-[#333333]/60">€ essence</p>
            </div>
          )}
          {voyage.stats.budget != null && (
            <div className="rounded-xl border border-[#E07856]/20 bg-white/60 p-4 text-center">
              <p className="mx-auto mb-1 text-lg">💰</p>
              <p className="font-courier text-2xl font-bold text-[#333333]">
                {voyage.stats.budget}
              </p>
              <p className="font-courier text-xs text-[#333333]/60">€ budget</p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {isOwner ? (
          <>
            <Link
              href={`/viago/${voyage.id}`}
              className="btn-terracotta rounded-[50px] border-2 border-[#E07856] bg-gradient-to-r from-[#E07856] to-[#D4635B] px-6 py-3 font-courier font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[#E07856]/50"
            >
              Voir le carnet (Viago)
            </Link>
            <Link
              href="/accueil"
              className="btn-terracotta rounded-[50px] border-2 border-[#E07856]/40 px-6 py-3 font-courier font-bold text-[#E07856] transition-all duration-300 hover:scale-105 hover:bg-white/60"
            >
              Retour à l&apos;accueil
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`/viago/${voyage.id}?mode=readonly`}
              className="btn-terracotta rounded-[50px] border-2 border-[#E07856] bg-gradient-to-r from-[#E07856] to-[#D4635B] px-6 py-3 font-courier font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[#E07856]/50"
            >
              Voir le carnet
            </Link>
            <Link
              href="/accueil"
              className="btn-terracotta rounded-[50px] border-2 border-[#E07856]/40 px-6 py-3 font-courier font-bold text-[#E07856] transition-all duration-300 hover:scale-105 hover:bg-white/60"
            >
              Retour à l&apos;accueil
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
