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
      setUrls([]);
      return;
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
  }, [stepKey]);

  if (urls.length === 0) return null;

  const doubled = [...urls, ...urls];

  return (
    <>
      <div className="photos-amis-fade relative h-32 w-full shrink-0 overflow-hidden sm:hidden">
        <div className="flex h-full animate-scroll-horizontal-slow">
          {doubled.map((u, j) => (
            <div
              key={j}
              className="h-full min-w-[100px] shrink-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${u})` }}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#5D3A1A]/90 via-[#5D3A1A]/25 to-transparent" />
      </div>
      <div className="photos-amis-fade relative hidden w-40 shrink-0 overflow-hidden sm:block md:w-48">
        <div className="flex h-full min-h-[7rem] animate-scroll-horizontal-slow">
          {doubled.map((u, j) => (
            <div
              key={j}
              className="h-full min-w-[120px] shrink-0 bg-cover bg-center md:min-w-[140px]"
              style={{ backgroundImage: `url(${u})` }}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#5D3A1A]/95 via-[#5D3A1A]/30 to-transparent" />
      </div>
    </>
  );
}
