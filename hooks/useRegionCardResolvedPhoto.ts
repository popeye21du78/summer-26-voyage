"use client";

import { useEffect, useState } from "react";

/**
 * Même URL que les validations `carousel-card:{id}` (priorité) puis header éditorial.
 * Aligne vignette carousel et hero carte inspiration.
 */
export function useRegionCardResolvedPhoto(region: { id: string; headerPhoto: string }) {
  const [src, setSrc] = useState(region.headerPhoto);
  const [resolveDone, setResolveDone] = useState(false);

  useEffect(() => {
    setSrc(region.headerPhoto);
    setResolveDone(false);
    if (!region.headerPhoto?.trim()) {
      setResolveDone(true);
      return;
    }
    const slug = `carousel-card:${region.id}`;
    let cancelled = false;
    fetch(
      `/api/photo-resolve?slug=${encodeURIComponent(slug)}&stepId=${encodeURIComponent(region.id)}&photoIndex=0`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { url?: string | null } | null) => {
        if (cancelled) return;
        if (d?.url) setSrc(d.url);
        setResolveDone(true);
      })
      .catch(() => {
        if (!cancelled) setResolveDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [region.id, region.headerPhoto]);

  return { src, resolveDone };
}
