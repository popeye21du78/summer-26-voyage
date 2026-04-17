"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { slugForLieuPhoto } from "@/lib/slug-for-lieu-photo";
import {
  cacheKeysLieuResolve,
  cachePhotoUrl,
  getCachedPhotoUrl,
} from "@/lib/client-photo-cache";
import {
  getClientPublicPhotoPick,
  getResolvedPhotoUrlList,
} from "@/lib/public-photo-client";
import { sharpenUnsplashUrl } from "@/lib/photo-display-url";
import { PhotoCurationOverlay } from "@/components/PhotoCurationOverlay";

interface CityPhotoProps {
  stepId: string;
  ville: string;
  initialUrl?: string | null;
  alt: string;
  className?: string;
  showChangeButton?: boolean;
  /** Barre Valider / Autre + enregistrement dans photo-validations.json */
  photoCuration?: boolean;
  curationTitle?: string;
  curationCompact?: boolean;
}

type RemoteJson = {
  url?: string;
  total?: number;
  totalWikipedia?: number;
  source?: string;
};

export function CityPhoto({
  stepId,
  ville,
  initialUrl,
  alt,
  className = "",
  showChangeButton = false,
  photoCuration = false,
  curationTitle,
  curationCompact = false,
}: CityPhotoProps) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [loading, setLoading] = useState(!initialUrl);
  const [error, setError] = useState(false);
  const [totalAlternatives, setTotalAlternatives] = useState<number | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  /** true = cycling uniquement JSON beauty/maintenance ; false = flux /api/photo-ville (Wikipedia, etc.) */
  const fromSiteJson = useRef(false);
  /** true = URL issue de l’index embarqué (top 200 + validations fichier) — pas d’API resolve. */
  const fromEmbeddedIndex = useRef(false);

  const fetchPhotoVille = useCallback(
    (refresh = false, nextIndex?: number) => {
      let cancelled = false;
      setLoading(true);
      setError(false);
      if (refresh) setUrl(null);

      const params = new URLSearchParams({ stepId, ville });
      params.set("slug", slugForLieuPhoto(stepId, ville));
      if (refresh) {
        params.set("refresh", "1");
        if (nextIndex !== undefined) params.set("photoIndex", String(nextIndex));
      }

      fetch(`/api/photo-ville?${params}`)
        .then((res) => {
          if (cancelled) return;
          if (!res.ok) throw new Error("Photo non trouvée");
          return res.json();
        })
        .then((data: RemoteJson) => {
          if (cancelled) return;
          if (data.url) {
            const s = slugForLieuPhoto(stepId, ville);
            cachePhotoUrl(cacheKeysLieuResolve(s, stepId), data.url);
          }
          setUrl(data.url ?? null);
          const tw = data.totalWikipedia;
          if (tw != null) setTotalAlternatives(tw);
          fromSiteJson.current = false;
        })
        .catch(() => {
          if (!cancelled) setError(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    },
    [stepId, ville]
  );

  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
      setLoading(false);
      fromSiteJson.current = false;
      fromEmbeddedIndex.current = false;
      return;
    }

    let cancelled = false;
    const slug = slugForLieuPhoto(stepId, ville);
    const cacheKey = cacheKeysLieuResolve(slug, stepId);
    const cached = getCachedPhotoUrl(cacheKey);
    fromEmbeddedIndex.current = false;
    setError(false);

    if (cached) {
      setUrl(cached);
      setLoading(false);
      fromSiteJson.current = true;
      const list = getResolvedPhotoUrlList(slug, stepId);
      setTotalAlternatives(list?.length ? list.length : 1);
      return () => {
        cancelled = true;
      };
    }

    const embedded = getClientPublicPhotoPick(slug, stepId, 0);
    if (embedded) {
      setUrl(embedded.url);
      cachePhotoUrl(cacheKey, embedded.url);
      setTotalAlternatives(embedded.total);
      setPhotoIndex(0);
      fromSiteJson.current = true;
      fromEmbeddedIndex.current = true;
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    fetch(
      `/api/photo-resolve?slug=${encodeURIComponent(slug)}&stepId=${encodeURIComponent(stepId)}&photoIndex=0`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: RemoteJson) => {
        if (cancelled) return;
        if (data?.url) {
          setUrl(data.url);
          cachePhotoUrl(cacheKey, data.url);
          setTotalAlternatives(data.total ?? 1);
          fromSiteJson.current = true;
          setPhotoIndex(0);
          setLoading(false);
          return;
        }
        fetchPhotoVille(false);
      })
      .catch(() => {
        if (!cancelled) fetchPhotoVille(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stepId, ville, initialUrl, fetchPhotoVille]);

  const handleChangePhoto = () => {
    const slug = slugForLieuPhoto(stepId, ville);
    const total = totalAlternatives ?? 0;
    const indexedList = getResolvedPhotoUrlList(slug, stepId);

    if (fromSiteJson.current && indexedList && indexedList.length > 1) {
      const next = (photoIndex + 1) % indexedList.length;
      setPhotoIndex(next);
      const nextUrl = indexedList[next];
      setUrl(nextUrl);
      cachePhotoUrl(cacheKeysLieuResolve(slug, stepId), nextUrl);
      return;
    }

    if (fromSiteJson.current && total > 1) {
      const next = (photoIndex + 1) % total;
      setPhotoIndex(next);
      setLoading(true);
      fetch(
        `/api/photo-resolve?slug=${encodeURIComponent(slug)}&stepId=${encodeURIComponent(stepId)}&photoIndex=${next}`
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((data: RemoteJson) => {
          if (data?.url) {
            cachePhotoUrl(cacheKeysLieuResolve(slug, stepId), data.url);
            setUrl(data.url);
            setLoading(false);
          } else {
            fromSiteJson.current = false;
            fetchPhotoVille(true, 0);
          }
        })
        .catch(() => {
          fromSiteJson.current = false;
          fetchPhotoVille(true, 0);
        });
      return;
    }

    if (fromSiteJson.current && total <= 1) {
      fromSiteJson.current = false;
      fetchPhotoVille(true, 0);
      return;
    }

    const next =
      totalAlternatives != null && totalAlternatives > 0
        ? (photoIndex + 1) % totalAlternatives
        : undefined;
    if (next !== undefined) setPhotoIndex(next);
    fetchPhotoVille(true, next);
  };

  if (loading) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-[#111111] ${className}`}
        aria-hidden
      >
        <img src="/A1.png" alt="" className="h-12 w-12 opacity-25" style={{ filter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(-15deg)" }} />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-[#1c1c1c] text-white/30 text-sm ${className}`}
        style={{ minHeight: 120 }}
      >
        <span>Pas de photo disponible</span>
      </div>
    );
  }

  const curationSlug = slugForLieuPhoto(stepId, ville);
  const displayUrl = sharpenUnsplashUrl(url);

  return (
    <div
      className={`${photoCuration ? "relative " : ""}${className}`.trim() || undefined}
    >
      <img
        src={displayUrl}
        alt={alt}
        className="photo-bw-reveal h-full w-full object-cover"
        loading="lazy"
        sizes="(max-width: 768px) 100vw, 800px"
      />
      {photoCuration && (
        <PhotoCurationOverlay
          slug={curationSlug}
          photoLookupStepId={stepId}
          imageUrl={url}
          title={curationTitle ?? ville}
          onOther={handleChangePhoto}
          compact={curationCompact}
        />
      )}
      {showChangeButton && (
        <button
          type="button"
          onClick={handleChangePhoto}
          className="absolute bottom-2 right-2 z-10 rounded-lg bg-black/60 px-2.5 py-1 font-courier text-[10px] font-bold text-[#E07856] backdrop-blur-sm transition hover:bg-black/80"
        >
          Changer de photo
        </button>
      )}
    </div>
  );
}
