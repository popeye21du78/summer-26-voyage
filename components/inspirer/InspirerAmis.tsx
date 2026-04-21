"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import LinkWithReturn from "@/components/LinkWithReturn";
import { Users } from "lucide-react";
import type { VoyageAmi } from "@/data/mock-friends";
import { EDITORIAL_PROFILES } from "@/data/test-profiles";
import AmiVoyageFlipCard from "./AmiVoyageFlipCard";

/** Suggestions « personnalités » : mènent vers un profil éditorial ou une entrée dédiée. */
const FAMOUS_SUGGESTIONS: {
  id: string;
  label: string;
  hint: string;
  href?: string;
}[] = [
  { id: "eva-viago", label: "Eva Viago", hint: "Profil éditorial", href: "/profil/eva-viago" },
  { id: "matteo-horizons", label: "Matteo Horizons", hint: "Montagne & villages", href: "/profil/matteo-horizons" },
  { id: "lina-routes", label: "Lina Routes", hint: "Vignobles", href: "/profil/lina-routes" },
  {
    id: "saint-exupery",
    label: "Antoine de Saint-Exupéry",
    hint: "Itinéraires liés — Stars",
    href: "/inspirer?tab=stars",
  },
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type Props = {
  searchQuery: string;
};

export default function InspirerAmis({ searchQuery: query }: Props) {
  const [voyages, setVoyages] = useState<VoyageAmi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/voyages-amis")
      .then((r) => (r.ok ? r.json() : { voyages: [] }))
      .then((data) => setVoyages(data.voyages ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const q = normalize(query.trim());

  const filteredVoyages = useMemo(() => {
    if (!q) return voyages;
    return voyages.filter((v) => {
      const hay = normalize(
        `${v.profileName} ${v.voyage.titre} ${v.voyage.sousTitre} ${v.type}`
      );
      return hay.includes(q);
    });
  }, [voyages, q]);

  const famousHits = useMemo(() => {
    if (!q) return [];
    return FAMOUS_SUGGESTIONS.filter(
      (f) => normalize(f.label).includes(q) || normalize(f.hint).includes(q)
    );
  }, [q]);

  const editorialHits = useMemo(() => {
    if (!q) return [];
    return EDITORIAL_PROFILES.filter(
      (p) => normalize(p.name).includes(q) || normalize(p.situationLabel).includes(q)
    );
  }, [q]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--color-bg-main)]">
        <p className="voyage-loading-text text-sm uppercase tracking-widest">
          voyage voyage…
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-bg-main)]">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {(famousHits.length > 0 || editorialHits.length > 0) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {editorialHits.map((p) => (
              <LinkWithReturn
                key={p.id}
                href={`/profil/${p.id}`}
                className="rounded-full border border-[var(--color-accent-start)]/35 bg-[var(--color-accent-start)]/10 px-3 py-1 font-courier text-[10px] font-bold text-[var(--color-accent-start)] transition hover:bg-[var(--color-accent-start)]/20"
              >
                Profil · {p.name}
              </LinkWithReturn>
            ))}
            {famousHits.map((f) => (
              <Link
                key={f.id}
                href={f.href ?? `/profil/${f.id}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-courier text-[10px] text-white/55 transition hover:border-white/20 hover:text-white/80"
              >
                {f.label}
              </Link>
            ))}
          </div>
        )}

        {voyages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-12">
            <Users className="h-12 w-12 text-[var(--color-accent-start)]/25" />
            <p className="text-center font-courier text-sm text-white/40">
              Les voyages de tes amis apparaîtront ici (connecte un profil de test).
            </p>
          </div>
        ) : filteredVoyages.length === 0 ? (
          <p className="py-8 text-center font-courier text-sm text-white/35">
            Aucun voyage ne correspond à « {query} ».
          </p>
        ) : (
          <div className="mx-auto flex max-w-md flex-col gap-8 pb-8">
            {filteredVoyages.map((v, i) => (
              <AmiVoyageFlipCard
                key={`${v.voyage.id}-${v.profileId}-${i}`}
                profileId={v.profileId}
                profileName={v.profileName}
                voyage={v.voyage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
