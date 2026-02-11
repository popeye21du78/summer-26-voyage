"use client";

import { useEffect, useState, useCallback } from "react";

/** Optimise les URLs Unsplash pour une meilleure netteté (Retina). */
function sharpenUnsplashUrl(url: string): string {
  if (!url.includes("images.unsplash.com")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}w=1200&q=85`;
}

interface CityPhotoProps {
  stepId: string;
  ville: string;
  /** Photo immédiate si déjà en cache (contenu_voyage.photos[0]) */
  initialUrl?: string | null;
  alt: string;
  className?: string;
  /** Afficher le bouton "Changer de photo" (page ville uniquement, pas dans le popup) */
  showChangeButton?: boolean;
}

export function CityPhoto({
  stepId,
  ville,
  initialUrl,
  alt,
  className = "",
  showChangeButton = false,
}: CityPhotoProps) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [loading, setLoading] = useState(!initialUrl);
  const [error, setError] = useState(false);

  const fetchPhoto = useCallback(
    (refresh = false) => {
      let cancelled = false;
      setLoading(true);
      setError(false);
      if (refresh) setUrl(null);

      const params = new URLSearchParams({ stepId, ville });
      if (refresh) params.set("refresh", "1");

      fetch(`/api/photo-ville?${params}`)
        .then((res) => {
          if (cancelled) return;
          if (!res.ok) throw new Error("Photo non trouvée");
          return res.json();
        })
        .then((data: { url?: string }) => {
          if (cancelled) return;
          setUrl(data.url ?? null);
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
      return;
    }
    return fetchPhoto(false);
  }, [stepId, ville, initialUrl, fetchPhoto]);

  const handleChangePhoto = () => {
    fetchPhoto(true);
  };

  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#E8E4DF] ${className}`}
        aria-hidden
      >
        <span className="voyage-loading-text text-sm sm:text-base">voyage voyage</span>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-[#E8E4DF] text-[#333333]/50 text-sm ${className}`}
        style={{ minHeight: 120 }}
      >
        <span>Pas de photo disponible</span>
      </div>
    );
  }

  return (
    <div className={className || undefined}>
      <img
        src={sharpenUnsplashUrl(url)}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        sizes="(max-width: 768px) 100vw, 800px"
      />
      {showChangeButton && (
        <button
          type="button"
          onClick={handleChangePhoto}
          className="absolute bottom-2 right-2 z-10 rounded bg-[#A55734]/90 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-[#8b4728]"
        >
          Changer de photo
        </button>
      )}
    </div>
  );
}
