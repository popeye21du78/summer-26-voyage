"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Route, Fuel } from "lucide-react";
import ViagoSection from "./ViagoSection";
import { LieuResolvedBackground } from "./LieuResolvedBackground";
import { mergeVoyageSteps } from "@/lib/voyage-local-overrides";
import type { Step } from "@/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ViagoPageClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const readOnly = searchParams.get("mode") === "readonly";
  const from = searchParams.get("from");

  const backHref = readOnly
    ? "/accueil"
    : from === "en-cours"
      ? `/voyage/${id}/en-cours`
      : from === "termine"
        ? `/voyage/${id}/termine`
        : `/voyage/${id}/prevu`;

  const [voyage, setVoyage] = useState<{
    id: string;
    titre: string;
    sousTitre?: string;
    steps: Step[];
    stats?: { km?: number; essence?: number; budget?: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetch(`/api/voyage/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || data.error) {
          setVoyage(null);
          setLoading(false);
          return;
        }
        const { isOwner: _o, ownerName: _n, ownerProfileId: _p, ...rest } = data;
        setVoyage(rest);
        setLoading(false);
      })
      .catch(() => {
        setVoyage(null);
        setLoading(false);
      });
  }, [id]);

  const mergedSteps = useMemo(() => {
    if (!voyage?.steps) return [];
    return mergeVoyageSteps(voyage.steps, voyage.id);
  }, [voyage]);

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center bg-[#1a1a1a]">
        <p className="font-courier text-white/70">Chargement…</p>
      </main>
    );
  }

  if (!voyage) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[#1a1a1a] px-4">
        <p className="font-courier text-white/80">Voyage introuvable.</p>
        <Link
          href="/accueil"
          className="font-courier text-[#E07856] underline transition-all hover:scale-105 hover:no-underline"
        >
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  const dateDebut = mergedSteps[0]?.date_prevue;
  const dateFin =
    mergedSteps[mergedSteps.length - 1]?.date_prevue ?? dateDebut;
  const first = mergedSteps[0];

  return (
    <main className="min-h-screen bg-[#0d0d0d]">
      <header className="relative flex min-h-[60vh] flex-col justify-end overflow-hidden">
        {first ? (
          <LieuResolvedBackground
            key={`${voyage.id}-${first.id}`}
            ville={first.nom}
            stepId={first.id}
            className="absolute inset-0 transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#5D3A1A] via-[#8B4513] to-[#A0522D]"
            aria-hidden
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/40 to-transparent" />
        <div className="absolute inset-0 bg-[#E07856]/20" />
        <div className="relative z-10 px-4 pb-12 pt-24 md:px-8 md:pb-16">
          <Link
            href={backHref}
            className="mb-6 inline-flex items-center gap-2 font-courier text-sm font-bold text-white/90 transition-all duration-300 hover:scale-105 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <h1 className="font-courier text-4xl font-bold tracking-wider text-white drop-shadow-2xl md:text-6xl">
            {voyage.titre}
          </h1>
          <p className="mt-2 font-courier text-lg font-bold text-[#E07856]">
            {voyage.sousTitre}
          </p>
          <p className="mt-2 font-courier text-sm text-white/80">
            {dateDebut && dateFin
              ? `${formatDate(dateDebut)} → ${formatDate(dateFin)}`
              : ""}
          </p>
          {voyage.stats && (
            <div className="mt-6 flex gap-8">
              {voyage.stats.km != null && (
                <span className="flex items-center gap-2 font-courier font-bold text-[#E07856]">
                  <Route className="h-5 w-5" />
                  {voyage.stats.km} km
                </span>
              )}
              {voyage.stats.essence != null && (
                <span className="flex items-center gap-2 font-courier font-bold text-[#E07856]">
                  <Fuel className="h-5 w-5" />
                  {voyage.stats.essence} € essence
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <div>
        {mergedSteps.map((step, i) => (
          <ViagoSection
            key={step.id}
            step={step}
            voyageId={voyage.id}
            index={i}
            readOnly={readOnly}
            variant={i % 2 === 0 ? "dark" : "light"}
          />
        ))}
      </div>
    </main>
  );
}
