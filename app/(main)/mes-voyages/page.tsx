"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Map, BookOpen, Calendar } from "lucide-react";
import type { VoyageStateResponse } from "../../api/voyage-state/route";

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
  }> = [];

  if (state?.voyagePrevu) {
    voyages.push({
      id: state.voyagePrevu.id,
      titre: state.voyagePrevu.titre,
      sousTitre: state.voyagePrevu.sousTitre,
      href: `/voyage/${state.voyagePrevu.id}/prevu`,
      type: "prevu",
    });
  }
  if (state?.voyageEnCours) {
    voyages.push({
      id: state.voyageEnCours.id,
      titre: state.voyageEnCours.titre,
      sousTitre: state.voyageEnCours.sousTitre,
      href: `/voyage/${state.voyageEnCours.id}/en-cours`,
      type: "en_cours",
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
        <div className="rounded-xl border border-[#E07856]/20 bg-white/60 p-12 text-center">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-[#E07856]/50" />
          <p className="font-courier text-sm text-[#333333]/70">
            Tu n&apos;as pas encore de voyage.
          </p>
          <Link
            href="/voyage/nouveau"
            className="btn-terracotta mt-4 inline-flex items-center gap-2 rounded-[50px] border-2 border-[#E07856] bg-gradient-to-r from-[#E07856] to-[#D4635B] px-6 py-3 font-courier font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[#E07856]/50"
          >
            Créer un voyage
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {voyages.map((v) => (
            <li key={v.id}>
              <Link
                href={v.href}
                className="flex items-center gap-4 rounded-xl border border-[#E07856]/20 bg-white/80 p-4 font-courier transition-all duration-300 hover:scale-[1.01] hover:border-[#E07856]/40 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E07856]/15">
                  <Map className="h-6 w-6 text-[#E07856]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-courier text-xs font-bold text-[#E07856]">
                    {typeLabels[v.type]}
                  </span>
                  <p className="font-courier font-bold text-[#333333]">{v.titre}</p>
                  <p className="truncate font-courier text-sm text-[#333333]/70">
                    {v.sousTitre}
                  </p>
                </div>
                <span className="font-courier text-[#E07856]">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        <Link
          href="/voyage/nouveau"
          className="btn-terracotta inline-flex items-center gap-2 rounded-[50px] border-2 border-[#E07856] bg-gradient-to-r from-[#E07856] to-[#D4635B] px-6 py-3 font-courier font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[#E07856]/50"
        >
          Créer un nouveau voyage
        </Link>
      </div>
    </main>
  );
}
