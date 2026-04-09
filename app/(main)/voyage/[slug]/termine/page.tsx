"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, Share2, Edit3 } from "lucide-react";

export default function VoyageTerminePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [voyage, setVoyage] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/voyage/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const { isOwner: o, ...rest } = data;
          setVoyage(rest);
          setIsOwner(o !== false);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="page-under-header flex min-h-[50vh] items-center justify-center px-4">
        <p className="font-courier text-[#333333]/70">Chargement…</p>
      </main>
    );
  }

  if (!voyage) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 pt-16">
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

  return (
    <main
      id="voyage-stats"
      className="page-under-header mx-auto max-w-2xl scroll-mt-28 px-4 py-10"
    >
      <Link
        href="/accueil"
        className="mb-6 inline-flex font-courier text-sm font-bold text-[#E07856] transition-all duration-300 hover:scale-105 hover:underline"
      >
        ← Retour à l&apos;accueil
      </Link>

      <h1 className="mb-2 scroll-mt-28 font-courier text-2xl font-bold tracking-wider text-[#333333] md:text-3xl">
        {voyage.titre}
      </h1>
      <p className="mb-8 font-courier text-sm text-[#333333]/70">{voyage.sousTitre}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={`/viago/${voyage.id}?from=termine`}
          className="btn-terracotta flex items-center gap-3 rounded-[50px] border-2 border-[#E07856] bg-gradient-to-r from-[#E07856] to-[#D4635B] px-6 py-4 font-courier font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[#E07856]/50"
        >
          <BookOpen className="h-6 w-6" />
          Revivre le voyage (Viago)
        </Link>
        {isOwner && (
          <Link
            href={`/voyage/${slug}/prevu?edit=1`}
            className="btn-terracotta flex items-center gap-3 rounded-[50px] border-2 border-[#E07856]/40 bg-white px-6 py-4 font-courier font-bold text-[#E07856] transition-all duration-300 hover:scale-105 hover:bg-white/80"
          >
            <Edit3 className="h-5 w-5" />
            Modifier l&apos;itinéraire
          </Link>
        )}
        <button
          type="button"
          className="flex items-center gap-3 rounded-[50px] border-2 border-[#E07856]/40 bg-white px-6 py-4 font-courier font-bold text-[#E07856] transition-all duration-300 hover:scale-105 hover:bg-white/80"
        >
          <Share2 className="h-5 w-5" />
          Partager (Instagram)
        </button>
      </div>

      {voyage.stats && (
        <div className="mt-8 rounded-xl border border-[#E07856]/20 bg-white/60 p-6">
          <h3 className="mb-4 font-courier text-base font-bold text-[#333333]">
            Récapitulatif
          </h3>
          <div className="flex flex-wrap gap-6 font-courier">
            {voyage.stats.km != null && (
              <p>
                <span className="text-2xl font-bold text-[#E07856]">
                  {voyage.stats.km}
                </span>{" "}
                <span className="text-sm text-[#333333]/70">km</span>
              </p>
            )}
            {voyage.stats.essence != null && (
              <p>
                <span className="text-2xl font-bold text-[#E07856]">
                  {voyage.stats.essence}
                </span>{" "}
                <span className="text-sm text-[#333333]/70">€ essence</span>
              </p>
            )}
            {voyage.stats.budget != null && (
              <p>
                <span className="text-2xl font-bold text-[#E07856]">
                  {voyage.stats.budget}
                </span>{" "}
                <span className="text-sm text-[#333333]/70">€ budget</span>
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
