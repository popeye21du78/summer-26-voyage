"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { minimalCommonsPhoto } from "@/lib/photo-curation-commons";
import { sharpenUnsplashUrl } from "@/lib/photo-display-url";

type Props = {
  slug: string;
  imageUrl: string;
  title?: string;
  onOther?: () => void;
  className?: string;
  /** Vignettes étroites (carousel stars, etc.) */
  compact?: boolean;
};

export function PhotoCurationOverlay({
  slug,
  imageUrl,
  title = "Photo",
  onOther,
  className,
  compact,
}: Props) {
  const normSlug = slug.trim().toLowerCase();
  const displayUrl = sharpenUnsplashUrl(imageUrl);
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  /** Évite qu’un GET lent écrase le check après un POST réussi (surtout sur mobile). */
  const validatedThisPhotoRef = useRef(false);

  useEffect(() => {
    validatedThisPhotoRef.current = false;
    setValidated(false);
  }, [normSlug, displayUrl]);

  useEffect(() => {
    if (!normSlug || !imageUrl) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/photo-curation?slug=${encodeURIComponent(normSlug)}&url=${encodeURIComponent(displayUrl)}`
    )
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { validated?: boolean }) => {
        if (!cancelled) {
          setValidated(validatedThisPhotoRef.current || !!d.validated);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [normSlug, displayUrl, imageUrl]);

  const handleValidate = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (validated || posting) return;
      setPosting(true);
      validatedThisPhotoRef.current = true;
      setValidated(true);
      try {
        const photo = minimalCommonsPhoto(displayUrl, title);
        const res = await fetch("/api/maintenance/photo-validation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: normSlug,
            action: "validate",
            photo,
            searchQuery: "",
          }),
        });
        if (!res.ok) {
          validatedThisPhotoRef.current = false;
          setValidated(false);
        }
      } catch {
        validatedThisPhotoRef.current = false;
        setValidated(false);
      } finally {
        setPosting(false);
      }
    },
    [displayUrl, normSlug, posting, title, validated]
  );

  const handleOther = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onOther?.();
    },
    [onOther]
  );

  if (!normSlug || !imageUrl) return null;

  return (
    <div
      className={`pointer-events-auto z-30 flex items-end justify-center ${
        compact ? "absolute bottom-0 left-0 right-0 pb-1 pt-6" : "absolute bottom-2 left-2 right-2"
      } ${className ?? ""}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {validated ? (
        <div
          className={`flex items-center justify-center rounded-lg bg-emerald-600/95 text-white shadow-lg shadow-black/30 ${
            compact ? "px-1.5 py-0.5" : "px-2.5 py-1"
          }`}
          title="Photo validée"
        >
          <Check className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2.5} />
        </div>
      ) : (
        <div
          className={`flex w-full max-w-full gap-1 rounded-lg bg-black/65 px-1 py-1 backdrop-blur-sm ${
            compact ? "gap-0.5 px-0.5 py-0.5" : ""
          }`}
        >
          <button
            type="button"
            disabled={posting}
            onClick={handleValidate}
            className={`flex-1 rounded-md bg-[#E07856] font-courier font-bold text-white transition hover:brightness-110 disabled:opacity-40 ${
              compact ? "py-0.5 text-[8px]" : "py-1 text-[10px]"
            }`}
          >
            Valider
          </button>
          <button
            type="button"
            disabled={!onOther}
            onClick={handleOther}
            className={`flex-1 rounded-md border border-white/25 bg-white/10 font-courier font-bold text-white/90 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35 ${
              compact ? "py-0.5 text-[8px]" : "py-1 text-[10px]"
            }`}
          >
            Autre
          </button>
        </div>
      )}
    </div>
  );
}
