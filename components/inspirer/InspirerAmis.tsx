"use client";

import { useState, useEffect } from "react";
import { Users, MapPin, Heart } from "lucide-react";

type AmiVoyage = {
  profileName: string;
  voyage: {
    id: string;
    titre: string;
    sousTitre: string;
    steps?: Array<{
      id: string;
      nom: string;
      contenu_voyage?: { photos?: string[] };
    }>;
  };
  type: string;
};

export default function InspirerAmis() {
  const [voyages, setVoyages] = useState<AmiVoyage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/voyages-amis")
      .then((r) => (r.ok ? r.json() : { voyages: [] }))
      .then((data) => setVoyages(data.voyages ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#111111]">
        <p className="voyage-loading-text text-sm uppercase tracking-widest">
          voyage voyage…
        </p>
      </div>
    );
  }

  if (voyages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#111111] px-6">
        <Users className="h-12 w-12 text-[#E07856]/25" />
        <p className="text-center font-courier text-sm text-white/40">
          Les voyages de tes amis apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#111111] px-4 py-4">
      <div className="space-y-4">
        {voyages.map((v, i) => {
          const photo = v.voyage.steps
            ?.flatMap((s) => s.contenu_voyage?.photos ?? [])
            .find(Boolean);
          return (
            <div
              key={`${v.voyage.id}-${i}`}
              className="overflow-hidden rounded-2xl border border-white/6 bg-white/3 shadow-lg shadow-black/20"
            >
              {photo && (
                <div
                  className="h-36 bg-cover bg-center"
                  style={{ backgroundImage: `url(${photo})` }}
                />
              )}
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#E07856] to-[#c94a4a]">
                    <span className="font-courier text-xs font-bold text-white">
                      {v.profileName.charAt(0)}
                    </span>
                  </div>
                  <span className="font-courier text-xs text-white/50">
                    {v.profileName}
                  </span>
                </div>
                <h3 className="font-courier text-sm font-bold text-white/90">
                  {v.voyage.titre}
                </h3>
                <p className="mt-1 font-courier text-[11px] text-white/40">
                  {v.voyage.sousTitre}
                </p>
                {v.voyage.steps && v.voyage.steps.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {v.voyage.steps.slice(0, 4).map((s) => (
                      <span
                        key={s.id}
                        className="flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 font-courier text-[10px] text-[#E07856]/80"
                      >
                        <MapPin className="h-2.5 w-2.5" />
                        {s.nom}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="mt-3 flex items-center gap-1.5 font-courier text-[11px] font-bold text-[#E07856]/50 transition hover:text-[#E07856]"
                >
                  <Heart className="h-3.5 w-3.5" />
                  Ajouter aux coups de cœur
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
