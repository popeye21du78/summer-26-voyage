"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { slugForLieuPhoto } from "@/lib/slug-for-lieu-photo";
import {
  cacheKeysLieuResolve,
  cachePhotoUrl,
  getCachedPhotoUrl,
} from "@/lib/client-photo-cache";
import { tryUserValidatedPhoto } from "@/lib/client-photo-validated";
import { loadPhotoValidationSnapshot } from "@/lib/client-photo-snapshot";
import {
  getClientPublicPhotoPick,
  getResolvedPhotoUrlList,
} from "@/lib/public-photo-client";
import { sharpenUnsplashUrl } from "@/lib/photo-display-url";
import { PhotoCurationOverlay } from "@/components/PhotoCurationOverlay";

type Props = {
  stepId: string;
  ville: string;
  tripTitle: string;
  compact?: boolean;
};

/**
 * Couverture Stars : une seule image, priorité hors API (snapshot + index + tel),
 * puis au plus un GET photo-resolve si rien en local.
 */
export function StarItineraryCover({ stepId, ville, tripTitle, compact }: Props) {
  const slug = useMemo(() => slugForLieuPhoto(stepId, ville), [stepId, ville]);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadPhotoValidationSnapshot();
      if (cancelled) return;

      const phone = tryUserValidatedPhoto(slug, stepId);
      const cached = getCachedPhotoUrl(cacheKeysLieuResolve(slug, stepId));
      const embedded = getClientPublicPhotoPick(slug, stepId, 0);
      const resolved = phone ?? cached ?? embedded?.url ?? null;

      if (resolved) {
        setUrl(resolved);
        setLoading(false);
        return;
      }

      try {
        const r = await fetch(
          `/api/photo-resolve?slug=${encodeURIComponent(slug)}&stepId=${encodeURIComponent(stepId)}&photoIndex=0`
        );
        const data = r.ok ? await r.json() : null;
        if (cancelled) return;
        if (data?.url) {
          cachePhotoUrl(cacheKeysLieuResolve(slug, stepId), data.url as string);
          setUrl(data.url);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, stepId]);

  const handleOther = useCallback(async () => {
    const list = getResolvedPhotoUrlList(slug, stepId);
    if (list && list.length > 1) {
      const next = (photoIndex + 1) % list.length;
      setPhotoIndex(next);
      const nextUrl = list[next];
      setUrl(nextUrl);
      cachePhotoUrl(cacheKeysLieuResolve(slug, stepId), nextUrl);
      return;
    }
    const total = list?.length ?? 0;
    const nextIdx = total > 0 ? (photoIndex + 1) % total : photoIndex + 1;
    try {
      const r = await fetch(
        `/api/photo-resolve?slug=${encodeURIComponent(slug)}&stepId=${encodeURIComponent(stepId)}&photoIndex=${nextIdx}`
      );
      const data = r.ok ? await r.json() : null;
      if (data?.url) {
        setPhotoIndex(nextIdx);
        setUrl(data.url);
        cachePhotoUrl(cacheKeysLieuResolve(slug, stepId), data.url);
      }
    } catch {
      /* ignore */
    }
  }, [photoIndex, slug, stepId]);

  if (loading) {
    return (
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-[#1c1c1c]" aria-hidden>
        <div className="h-8 w-8 rounded-full border-2 border-[#E07856]/20 border-t-[#E07856] animate-spin" />
      </div>
    );
  }

  if (!url) {
    return (
      <div
        className="absolute inset-0 z-0 bg-gradient-to-br from-[#2a2a2a] to-[#111]"
        aria-hidden
      />
    );
  }

  const displayUrl = sharpenUnsplashUrl(url);

  return (
    <>
      <img
        src={displayUrl}
        alt=""
        className="photo-bw-reveal absolute inset-0 z-0 h-full w-full object-cover"
        loading={compact ? "lazy" : "eager"}
        decoding="async"
      />
      <PhotoCurationOverlay
        slug={slug}
        photoLookupStepId={stepId}
        imageUrl={url}
        title={tripTitle}
        onOther={handleOther}
        compact={compact}
      />
    </>
  );
}
