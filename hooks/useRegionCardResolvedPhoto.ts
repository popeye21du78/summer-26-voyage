"use client";

import { useEffect, useState } from "react";
import {
  cacheKeysCarouselCard,
  cachePhotoUrl,
  getCachedPhotoUrl,
} from "@/lib/client-photo-cache";
import { getUserValidatedPhotoUrl } from "@/lib/client-photo-validated";

/**
 * URL carte région / carrousel : jamais d’image éditoriale « au pif » avant résolution.
 * Ordre : cache session → validation téléphone (localStorage) → photo-resolve → fallback éditorial.
 */
export function useRegionCardResolvedPhoto(region: { id: string; headerPhoto: string }) {
  const ck = cacheKeysCarouselCard(region.id);
  const carouselSlug = `carousel-card:${region.id}`;

  const [src, setSrc] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return getCachedPhotoUrl(ck) ?? getUserValidatedPhotoUrl(carouselSlug) ?? null;
  });
  const [resolveDone, setResolveDone] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!(getCachedPhotoUrl(ck) ?? getUserValidatedPhotoUrl(carouselSlug));
  });

  useEffect(() => {
    const cached = getCachedPhotoUrl(ck) ?? getUserValidatedPhotoUrl(carouselSlug);
    if (cached) {
      setSrc(cached);
      setResolveDone(true);
      return;
    }

    setSrc(null);
    setResolveDone(false);

    if (!region.id?.trim()) {
      setSrc(region.headerPhoto || null);
      setResolveDone(true);
      return;
    }

    let cancelled = false;
    fetch(
      `/api/photo-resolve?slug=${encodeURIComponent(carouselSlug)}&stepId=${encodeURIComponent(
        region.id
      )}&photoIndex=0`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { url?: string | null } | null) => {
        if (cancelled) return;
        const url = d?.url?.trim();
        if (url) {
          setSrc(url);
          cachePhotoUrl(ck, url);
        } else {
          setSrc(region.headerPhoto?.trim() || null);
        }
        setResolveDone(true);
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(region.headerPhoto?.trim() || null);
          setResolveDone(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ck, carouselSlug, region.id, region.headerPhoto]);

  return { src, resolveDone };
}
