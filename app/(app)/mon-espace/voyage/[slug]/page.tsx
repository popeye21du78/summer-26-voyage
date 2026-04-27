"use client";

import { useLayoutEffect, useState, useMemo, useRef } from "react";
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
  upsertCreatedVoyage,
  type CreatedVoyage,
} from "@/lib/created-voyages";
import { createdVoyageToVoyageViewSafe } from "@/lib/created-voyage-page";
import { takeCreatedVoyageHandoff } from "@/lib/voyage-created-handoff";
import {
  readCreatedVoyageFromHandoffUrl,
  stripHandoffFromAddressBar,
} from "@/lib/created-voyage-handoff-url";
import type { Voyage } from "@/data/mock-voyages";
import VoyageDetailInteractive from "@/components/mon-espace/VoyageDetailInteractive";

const VoyageMapView = dynamic(() => import("./VoyageMapView"), { ssr: false });

function buildVoyageFromApiPayload(d: unknown): Voyage | null {
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;
  const { createdVoyagePayload: _cv, isOwner: _io, ownerName: _on, ownerProfileId: _op, ...rest } = o;
  const raw = (rest.voyage ?? rest) as unknown;
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.id === "string" && Array.isArray(v.steps)) {
    return raw as Voyage;
  }
  return null;
}

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

/**
 * Après le clic « ébauche » : 1) tampon module JS (même exécution) 2) carnet 3) session.
 */
function hydrateCreatedAllSources(sid: string): CreatedVoyage | null {
  return (
    takeCreatedVoyageHandoff(sid) ??
    getCreatedVoyageById(sid) ??
    takeLastCreatedVoyageForSessionIfSlug(sid) ??
    takeNavInflightCreatedIfSlug(sid)
  );
}

function viewFromCreated(cv: CreatedVoyage): Voyage {
  clearNavInflightCreated();
  return createdVoyageToVoyageViewSafe(cv);
}

export default function VoyageDetailPage() {
  const params = useParams();
  const pathname = usePathname() ?? "";
  const [locSlug, setLocSlug] = useState("");
  const slug = useMemo(() => {
    if (locSlug) return locSlug;
    return resolveSlugFromRouter(params, pathname);
  }, [params, pathname, locSlug]);

  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingApi, setLoadingApi] = useState(false);
  const runId = useRef(0);

  useLayoutEffect(() => {
    const my = ++runId.current;
    const fromWindow = readSlugFromWindowPath();
    if (fromWindow && fromWindow !== locSlug) {
      setLocSlug(fromWindow);
    }

    const s =
      fromWindow || slug || resolveSlugFromRouter(params, pathname) || "";

    if (!s) {
      if (my !== runId.current) return;
      setVoyage(null);
      setReady(true);
      setLoadingApi(false);
      return;
    }

    if (s.toLowerCase().startsWith("created-")) {
      setLoadingApi(true);
      setReady(false);
      let cancelled = false;
      let clientFallbackTimer: number | undefined;

      const applyFromUrl = (v: ReturnType<typeof readCreatedVoyageFromHandoffUrl>) => {
        if (!v || v.voyage.id !== s) return false;
        try {
          upsertCreatedVoyage(v.voyage);
        } catch {
          /* ignore */
        }
        if (my !== runId.current) return true;
        setVoyage(viewFromCreated(v.voyage));
        stripHandoffFromAddressBar(s);
        setReady(true);
        setLoadingApi(false);
        return true;
      };

      const finishClientOnly = () => {
        if (cancelled || my !== runId.current) return;
        if (applyFromUrl(readCreatedVoyageFromHandoffUrl())) return;
        const cv = hydrateCreatedAllSources(s);
        setVoyage(cv ? viewFromCreated(cv) : null);
        setReady(true);
        setLoadingApi(false);
      };

      const applyApiJson = (d: unknown) => {
        if (cancelled || my !== runId.current) return;
        if (d && typeof d === "object" && "createdVoyagePayload" in d) {
          const p = (d as { createdVoyagePayload?: CreatedVoyage }).createdVoyagePayload;
          if (p && p.id === s) {
            try {
              upsertCreatedVoyage(p);
            } catch {
              /* ignore */
            }
          }
        }
        const fromApi = buildVoyageFromApiPayload(d);
        if (fromApi) {
          clearNavInflightCreated();
          setVoyage(fromApi);
          setLoadingApi(false);
          setReady(true);
          return;
        }
        finishClientOnly();
      };

      fetch(`/api/voyage/${encodeURIComponent(s)}`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: unknown) => {
          if (d) {
            applyApiJson(d);
            return;
          }
          if (cancelled || my !== runId.current) return;
          clientFallbackTimer = window.setTimeout(() => {
            if (cancelled || my !== runId.current) return;
            if (applyFromUrl(readCreatedVoyageFromHandoffUrl())) return;
            finishClientOnly();
          }, 0);
        })
        .catch(() => {
          if (cancelled || my !== runId.current) return;
          finishClientOnly();
        });

      return () => {
        cancelled = true;
        if (clientFallbackTimer !== undefined) {
          clearTimeout(clientFallbackTimer);
        }
      };
    }

    setLoadingApi(true);
    setReady(false);
    let cancelled = false;
    fetch(`/api/voyage/${encodeURIComponent(s)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, unknown> | null) => {
        if (cancelled || my !== runId.current) return;
        const fromApi = buildVoyageFromApiPayload(d);
        if (fromApi) {
          setVoyage(fromApi);
          return;
        }
        const local = loadCreatedVoyages().find((cv) => cv.id === s) as
          | CreatedVoyage
          | undefined;
        if (local) {
          setVoyage(viewFromCreated(local));
          return;
        }
        const fb = takeLastCreatedVoyageForSessionIfSlug(s) ?? takeNavInflightCreatedIfSlug(s);
        setVoyage(fb ? viewFromCreated(fb) : null);
      })
      .catch(() => {
        if (cancelled || my !== runId.current) return;
        const local = loadCreatedVoyages().find((cv) => cv.id === s) as
          | CreatedVoyage
          | undefined;
        if (local) {
          setVoyage(viewFromCreated(local));
        } else {
          const fb = takeLastCreatedVoyageForSessionIfSlug(s) ?? takeNavInflightCreatedIfSlug(s);
          setVoyage(fb ? viewFromCreated(fb) : null);
        }
      })
      .finally(() => {
        if (cancelled || my !== runId.current) return;
        setLoadingApi(false);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [params, pathname, slug, locSlug]);

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

  const isCreatedRoute = (slug && slug.toLowerCase().startsWith("created-")) || false;
  const blocking = !ready || (!isCreatedRoute && loadingApi);

  if (blocking) {
    return (
      <main className="min-h-full flex-1 bg-gradient-to-b from-[var(--color-bg-main)] to-[var(--color-bg-gradient-end)]" />
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
