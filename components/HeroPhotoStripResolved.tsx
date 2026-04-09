"use client";

import { useEffect, useState } from "react";
import HeroPhotoStrip, { type PhotoItem } from "./HeroPhotoStrip";
import { getHeroBatchCached, setHeroBatchCached } from "@/lib/hero-photo-batch-cache";

export type HeroStepRef = { id: string; nom: string };

type Props = {
  steps: HeroStepRef[];
};

/**
 * Bandeau hero : résout les vignettes via /api/photo-lieu-batch (même pipeline que le site).
 */
export default function HeroPhotoStripResolved({ steps }: Props) {
  /** Signature stable (évite de relancer le batch à chaque render parent, ex. décompte 1 Hz). */
  const stepsKey = steps.length === 0 ? "" : steps.map((s) => s.id).join(">");

  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    stepsKey ? getHeroBatchCached(stepsKey) ?? [] : []
  );

  useEffect(() => {
    if (!stepsKey) {
      setPhotos([]);
      return;
    }
    const cached = getHeroBatchCached(stepsKey);
    if (cached?.length) setPhotos(cached);

    const items = steps.map((s) => ({ nom: s.nom, id: s.id }));
    let dead = false;
    fetch("/api/photo-lieu-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { results?: { nom?: string; url?: string | null }[] } | null) => {
        if (dead || !j?.results) return;
        const list: PhotoItem[] = [];
        for (const row of j.results) {
          if (row?.url) list.push({ url: row.url, nom: row.nom ?? "" });
        }
        if (list.length > 0) {
          setHeroBatchCached(stepsKey, list);
          setPhotos(list);
        }
      })
      .catch(() => {
        if (!dead && !getHeroBatchCached(stepsKey)?.length) setPhotos([]);
      });
    return () => {
      dead = true;
    };
    // steps volontairement omis : seul stepsKey (ids + ordre) doit déclencher le batch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- éviter boucle si parent repasse un nouveau [] à chaque tick (décompte)
  }, [stepsKey]);

  return <HeroPhotoStrip photos={photos} suppressFallback />;
}
