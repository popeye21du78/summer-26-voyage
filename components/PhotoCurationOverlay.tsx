"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cacheKeysLieuResolve, cachePhotoUrl } from "@/lib/client-photo-cache";
import { persistUserValidatedPhoto } from "@/lib/client-photo-validated";
import { minimalCommonsPhoto } from "@/lib/photo-curation-commons";
import { isOfflineKnownPhoto } from "@/lib/public-photo-client";
import { sharpenUnsplashUrl } from "@/lib/photo-display-url";

type Props = {
  slug: string;
  imageUrl: string;
  title?: string;
  onOther?: () => void;
  className?: string;
  /** Vignettes étroites (carousel stars, etc.) */
  compact?: boolean;
  /** Pour résoudre l’index embarqué (même clé que photo-resolve). */
  photoLookupStepId?: string;
  /** Clé sessionStorage additionnelle (ex. hero région `region-header:…`). */
  sessionPhotoCacheKey?: string;
};

export function PhotoCurationOverlay({
  slug,
  imageUrl,
  title = "Photo",
  onOther,
  className,
  compact,
  photoLookupStepId,
  sessionPhotoCacheKey,
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
    const step = (photoLookupStepId ?? normSlug).trim().toLowerCase();
    if (isOfflineKnownPhoto(normSlug, step, imageUrl)) {
      setValidated(true);
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
  }, [normSlug, displayUrl, imageUrl, photoLookupStepId]);

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
        } else {
          const raw = imageUrl.trim();
          persistUserValidatedPhoto(normSlug, raw);
          const stepKey = photoLookupStepId?.trim().toLowerCase();
          if (stepKey && stepKey !== normSlug) {
            persistUserValidatedPhoto(stepKey, raw);
          }
          if (photoLookupStepId) {
            cachePhotoUrl(cacheKeysLieuResolve(normSlug, photoLookupStepId), raw);
          }
          if (sessionPhotoCacheKey) {
            cachePhotoUrl(sessionPhotoCacheKey, raw);
          }
        }
      } catch {
        validatedThisPhotoRef.current = false;
        setValidated(false);
      } finally {
        setPosting(false);
      }
    },
    [displayUrl, normSlug, photoLookupStepId, posting, sessionPhotoCacheKey, title, validated]
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

  /** Pas de boutons tant que l’état « déjà validé ? » n’est pas connu (évite flash Valider). */
  if (loading) return null;

  return (
    <div
      className={`pointer-events-auto z-[100] flex touch-manipulation justify-center ${
        compact
          ? "absolute left-1 right-1 top-1 items-start pt-0"
          : "absolute bottom-2 left-2 right-2 items-end"
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
            className={`min-h-[36px] flex-1 rounded-md bg-[var(--color-accent-start)] font-courier font-bold text-white transition hover:brightness-110 disabled:opacity-40 ${
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
