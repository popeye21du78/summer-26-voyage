"use client";

import { useEffect, useLayoutEffect, useState, useMemo, useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import {
  loadCreatedVoyages,
  getCreatedVoyageById,
  takeLastCreatedVoyageForSessionIfSlug,
  takeNavInflightCreatedIfSlug,
  clearNavInflightCreated,
  type CreatedVoyage,
} from "@/lib/created-voyages";
import { createdVoyageToVoyageViewSafe } from "@/lib/created-voyage-page";
import type { Voyage } from "@/data/mock-voyages";
import VoyageDetailInteractive from "@/components/mon-espace/VoyageDetailInteractive";

const VoyageMapView = dynamic(() => import("./VoyageMapView"), { ssr: false });

function buildVoyageFromApiPayload(d: unknown): Voyage | null {
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;
  const raw = (o.voyage ?? o) as unknown;
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.id === "string" && Array.isArray(v.steps)) {
    return raw as Voyage;
  }
  return null;
}

/**
 * `useParams().slug` est parfois vide au 1er rendu après une navigation client
 * (Next.js / App Router) : on relit le segment depuis l’URL.
 */
function resolveSlugFromRouter(
  params: ReturnType<typeof useParams>,
  pathname: string
): string {
  const p = params?.slug;
  if (typeof p === "string" && p.length > 0) {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  }
  if (Array.isArray(p) && p[0]) {
    try {
      return decodeURIComponent(p[0]);
    } catch {
      return p[0];
    }
  }
  const m = pathname.match(/\/mon-espace\/voyage\/([^/?#]+)/);
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }
  return "";
}

function readSlugFromWindowPath(): string {
  if (typeof window === "undefined") return "";
  const m = window.location.pathname.match(/\/mon-espace\/voyage\/([^/?#]+)/);
  if (!m?.[1]) return "";
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

function isVoyageDetailPathname(p: string): boolean {
  return /\/mon-espace\/voyage\//.test(p);
}

function hydrateCreatedLocal(slug: string): CreatedVoyage | null {
  return (
    getCreatedVoyageById(slug) ??
    takeLastCreatedVoyageForSessionIfSlug(slug) ??
    takeNavInflightCreatedIfSlug(slug)
  );
}

const CREATED_RETRY_MS = [0, 50, 100, 200, 400, 800, 1600, 3000, 5000, 8000] as const;

export default function VoyageDetailPage() {
  const params = useParams();
  const pathname = usePathname() ?? "";
  const [locSlug, setLocSlug] = useState("");

  /** Mobile / WebView : `usePathname` + `useParams` peuvent rester vides un instant après le push. */
  useLayoutEffect(() => {
    setLocSlug(readSlugFromWindowPath());
  }, [pathname]);

  const slug = useMemo(() => {
    const fromWindow = locSlug;
    const fromNext = resolveSlugFromRouter(params, pathname);
    if (fromWindow) return fromWindow;
    if (fromNext) return fromNext;
    return "";
  }, [params, pathname, locSlug]);
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [loading, setLoading] = useState(true);
  const prevSlugRef = useRef<string | null>(null);
  /** Évite de relancer hydratation / timers si le slug n’a pas changé (pathname / locSlug qui bougent). */
  const createdHydratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setLocSlug(readSlugFromWindowPath());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    /**
     * Segment pas encore dispo : ne jamais conclure « introuvable » si l’URL réelle
     * (barre d’adresse) ou le chemin Next indiquent une fiche `/mon-espace/voyage/…`.
     */
    if (!slug) {
      const winPath = typeof window !== "undefined" ? window.location.pathname : "";
      if (isVoyageDetailPathname(pathname) || (winPath && isVoyageDetailPathname(winPath))) {
        const s = readSlugFromWindowPath();
        if (s) setLocSlug(s);
        return;
      }
      setVoyage(null);
      setLoading(false);
      prevSlugRef.current = null;
      return;
    }

    if (prevSlugRef.current !== slug) {
      setLoading(true);
      setVoyage(null);
      prevSlugRef.current = slug;
      createdHydratedRef.current = null;
    }

    if (slug.toLowerCase().startsWith("created-")) {
      if (createdHydratedRef.current === slug) {
        return;
      }
      const apply = (cv: CreatedVoyage | null, done: boolean) => {
        if (cv) {
          setVoyage(createdVoyageToVoyageViewSafe(cv));
          createdHydratedRef.current = slug;
          clearNavInflightCreated();
        } else if (done) {
          setVoyage(null);
        }
        if (done) setLoading(false);
      };

      const first = hydrateCreatedLocal(slug);
      if (first) {
        apply(first, true);
        return;
      }

      const timers: number[] = [];
      let attempt = 0;
      const scheduleNext = () => {
        if (attempt >= CREATED_RETRY_MS.length) {
          setVoyage(null);
          setLoading(false);
          return;
        }
        const delay = CREATED_RETRY_MS[attempt];
        attempt += 1;
        const id = window.setTimeout(() => {
          const syncSlug = readSlugFromWindowPath() || slug;
          if (syncSlug && syncSlug !== slug) {
            setLocSlug(syncSlug);
          }
          const cv = hydrateCreatedLocal(syncSlug);
          const isLast = attempt >= CREATED_RETRY_MS.length;
          if (cv) {
            apply(cv, true);
            return;
          }
          if (isLast) {
            setVoyage(null);
            setLoading(false);
            return;
          }
          scheduleNext();
        }, delay);
        timers.push(id);
      };
      /** Première reprise immédiate + enchaînements espacés (storage lent / Safari). */
      scheduleNext();

      return () => {
        for (const id of timers) window.clearTimeout(id);
      };
    }

    let cancelled = false;
    fetch(`/api/voyage/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, unknown> | null) => {
        if (cancelled) return;
        const fromApi = buildVoyageFromApiPayload(d);
        if (fromApi) {
          setVoyage(fromApi);
          return;
        }
        const local = loadCreatedVoyages().find((cv) => cv.id === slug) as
          | CreatedVoyage
          | undefined;
        if (local) {
          setVoyage(createdVoyageToVoyageViewSafe(local));
          return;
        }
        const sessionFallback = takeLastCreatedVoyageForSessionIfSlug(slug);
        if (sessionFallback) {
          setVoyage(createdVoyageToVoyageViewSafe(sessionFallback));
          return;
        }
        setVoyage(null);
      })
      .catch(() => {
        if (cancelled) return;
        const local = loadCreatedVoyages().find((cv) => cv.id === slug) as
          | CreatedVoyage
          | undefined;
        if (local) {
          setVoyage(createdVoyageToVoyageViewSafe(local));
        } else {
          const sessionFallback = takeLastCreatedVoyageForSessionIfSlug(slug);
          setVoyage(
            sessionFallback ? createdVoyageToVoyageViewSafe(sessionFallback) : null
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, pathname, locSlug]);

  const stepCoords = useMemo(() => {
    if (!voyage) return [];
    return voyage.steps
      .filter((s) => s.coordonnees?.lat != null && s.coordonnees?.lng != null)
      .map((s) => ({
        id: s.id,
        nom: s.nom,
        lat: s.coordonnees.lat,
        lng: s.coordonnees.lng,
      }));
  }, [voyage]);

  if (loading) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-b from-[var(--color-bg-main)] to-[var(--color-bg-gradient-end)]">
        <p className="voyage-loading-text text-sm uppercase tracking-widest">
          voyage voyage…
        </p>
      </main>
    );
  }

  if (!voyage) {
    return (
      <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-gradient-to-b from-[var(--color-bg-main)] to-[var(--color-bg-gradient-end)] px-6">
        <p className="font-courier text-sm text-[var(--color-text-secondary)]">Voyage introuvable.</p>
        <Link
          href="/mon-espace"
          className="font-courier text-xs font-bold text-[var(--color-accent-start)]"
        >
          Retour
        </Link>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-full flex-col bg-gradient-to-b from-[var(--color-bg-main)] to-[var(--color-bg-gradient-end)]">
      <div className="relative h-[40vh] min-h-[260px] shrink-0">
        <VoyageMapView
          steps={stepCoords}
          mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          routeProfile={voyage.routeProfile}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--color-bg-main)] to-transparent" />
        <Link
          href="/mon-espace"
          className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 font-courier text-xs font-bold text-white backdrop-blur-sm transition hover:bg-black/60"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </Link>
      </div>

      <VoyageDetailInteractive voyage={voyage} />
    </main>
  );
}
