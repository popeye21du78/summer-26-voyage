"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Route, Fuel } from "lucide-react";
import ViagoSection from "../../../../components/ViagoSection";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ViagoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const readOnly = searchParams?.get("mode") === "readonly";
  const [voyage, setVoyage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/voyage/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setVoyage(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

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

  const dateDebut = voyage.steps[0]?.date_prevue;
  const dateFin =
    voyage.steps[voyage.steps.length - 1]?.date_prevue ?? dateDebut;
  const firstPhoto = voyage.steps[0]?.contenu_voyage?.photos?.[0];

  return (
    <main className="min-h-screen bg-[#0d0d0d]">
      {/* Hero full-width — style site voiture */}
      <header className="relative flex min-h-[60vh] flex-col justify-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{
            backgroundImage: firstPhoto
              ? `url(${firstPhoto})`
              : "linear-gradient(135deg, #5D3A1A 0%, #8B4513 50%, #A0522D 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/40 to-transparent" />
        <div className="absolute inset-0 bg-[#E07856]/20" />
        <div className="relative z-10 px-4 pb-12 pt-24 md:px-8 md:pb-16">
          <Link
            href={readOnly ? "/accueil" : `/voyage/${id}/termine`}
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

      {/* Sections par étape — alternance dark/light */}
      <div>
        {voyage.steps.map((step: any, i: number) => (
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
