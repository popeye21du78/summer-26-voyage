"use client";

import { useEffect, useState } from "react";

type StepRef = { id: string; nom: string };

type Props = {
  steps: StepRef[];
};

/**
 * Bandeau photos pour un voyage ami — un seul batch pour mobile + desktop.
 */
export default function AmiVoyagePhotoStrip({ steps }: Props) {
  const [urls, setUrls] = useState<string[]>([]);

  const stepKey = steps.map((s) => `${s.id}:${s.nom}`).join("|");

  useEffect(() => {
    if (steps.length === 0) {
      const id = window.setTimeout(() => setUrls([]), 0);
      return () => window.clearTimeout(id);
    }
    let dead = false;
    fetch("/api/photo-lieu-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: steps.map((s) => ({ nom: s.nom, id: s.id })),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { results?: { url?: string | null }[] } | null) => {
        if (dead || !j?.results) return;
        const u = j.results.map((row) => row.url).filter((x): x is string => Boolean(x));
        setUrls(u);
      })
      .catch(() => {
        if (!dead) setUrls([]);
      });
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stepKey encode les steps
  }, [stepKey]);

  if (urls.length === 0) return null;

  const doubled = [...urls, ...urls];
  const first = urls[0];

  return (
    <>
      {/* Mobile : vignette statique (pas de masque / pas d’artefact « curseur » au centre) */}
      {first && (
        <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg sm:hidden">
          <div
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${first})` }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#5D3A1A]/55 to-transparent" />
        </div>
      )}
      {/* Desktop : bandeau défilant, sans mask CSS qui tranche l’image au milieu */}
      <div className="relative hidden w-40 shrink-0 overflow-hidden rounded-r-lg sm:block md:w-48">
        <div className="flex h-full min-h-[7rem] animate-scroll-horizontal-slow">
          {doubled.map((u, j) => (
            <div
              key={j}
              className="h-full min-w-[120px] shrink-0 bg-cover bg-center md:min-w-[140px]"
              style={{ backgroundImage: `url(${u})` }}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#5D3A1A]/85 via-[#5D3A1A]/20 to-transparent" />
      </div>
    </>
  );
}
