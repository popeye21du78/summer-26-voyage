"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Calendar } from "lucide-react";
import type { VoyageStateResponse } from "@/types/voyage-state";
import type { Voyage } from "../../../data/mock-voyages";
import VoyageCoverThumb from "../../../components/VoyageCoverThumb";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function MesVoyagesPage() {
  const [state, setState] = useState<VoyageStateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/voyage-state")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setState(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4 pt-16">
        <p className="font-courier text-[#333333]/70">Chargement…</p>
      </main>
    );
  }

  const voyages: Array<{
    id: string;
    titre: string;
    sousTitre: string;
    href: string;
    type: "prevu" | "en_cours" | "termine";
    voyage: Voyage;
  }> = [];

  const prevus =
    state?.voyagesPrevus && state.voyagesPrevus.length > 0
      ? state.voyagesPrevus
      : state?.voyagePrevu
        ? [state.voyagePrevu]
        : [];
  for (const v of prevus) {
    voyages.push({
      id: v.id,
      titre: v.titre,
      sousTitre: v.sousTitre,
      href: `/voyage/${v.id}/prevu`,
      type: "prevu",
      voyage: v,
    });
  }
  if (state?.voyageEnCours) {
    voyages.push({
      id: state.voyageEnCours.id,
      titre: state.voyageEnCours.titre,
      sousTitre: state.voyageEnCours.sousTitre,
      href: `/voyage/${state.voyageEnCours.id}/en-cours`,
      type: "en_cours",
      voyage: state.voyageEnCours,
    });
  }
  if (state?.voyagesTermines?.length) {
    state.voyagesTermines.forEach((v) => {
      voyages.push({
        id: v.id,
        titre: v.titre,
        sousTitre: v.sousTitre,
        href: `/voyage/${v.id}/termine`,
        type: "termine",
        voyage: v,
      });
    });
  }

  const typeLabels = {
    prevu: "À venir",
    en_cours: "En cours",
    termine: "Terminé",
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 pt-16">
      <h1 className="mb-2 font-courier text-2xl font-bold tracking-wider text-[#333333]">
        Mes voyages
      </h1>
      <p className="mb-8 font-courier text-sm text-[#333333]/80">
        Choisis un voyage pour ouvrir son carnet et sa carte.
      </p>

      {voyages.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-accent-start)]/20 bg-white/60 p-12 text-center">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-[var(--color-accent-start)]/50" />
          <p className="font-courier text-sm text-[#333333]/70">
            Tu n&apos;as pas encore de voyage.
          </p>
          <Link
            href="/planifier/commencer"
            className="btn-terracotta mt-4 inline-flex items-center gap-2 rounded-[50px] border-2 border-[var(--color-accent-start)] bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-mid)] px-6 py-3 font-courier font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[var(--color-accent-start)]/50"
          >
            Créer un voyage
          </Link>
        </div>
      ) : (
        <ul className="mx-auto grid max-w-sm grid-cols-1 gap-5 sm:max-w-none sm:grid-cols-2">
          {voyages.map((v) => (
            <li key={v.id} className="flex justify-center">
              <Link
                href={v.href}
                className="flex w-full max-w-[280px] flex-col overflow-hidden rounded-2xl border border-[var(--color-accent-start)]/25 bg-white/90 font-courier shadow-md transition-all duration-300 hover:border-[var(--color-accent-start)]/45 hover:shadow-lg sm:max-w-none"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f5f0eb]">
                  <VoyageCoverThumb
                    voyage={v.voyage}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-[var(--color-accent-start)]/95 px-2.5 py-1 font-courier text-[10px] font-bold uppercase tracking-wide text-white shadow">
                    {typeLabels[v.type]}
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-1 p-4">
                  <p className="line-clamp-2 font-courier font-bold leading-snug text-[#333333]">
                    {v.titre}
                  </p>
                  <p className="line-clamp-3 font-courier text-sm text-[#333333]/75">
                    {v.sousTitre}
                  </p>
                  <span className="mt-auto pt-2 font-courier text-xs font-bold text-[var(--color-accent-start)]">
                    Ouvrir →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        <Link
          href="/planifier/commencer"
          className="btn-terracotta inline-flex items-center gap-2 rounded-[50px] border-2 border-[var(--color-accent-start)] bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-mid)] px-6 py-3 font-courier font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[var(--color-accent-start)]/50"
        >
          Créer un nouveau voyage
        </Link>
      </div>
    </main>
  );
}
