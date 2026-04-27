"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import {
  loadCreatedVoyages,
  getCreatedVoyageById,
  takeLastCreatedVoyageForSessionIfSlug,
  type CreatedVoyage,
} from "@/lib/created-voyages";
import { createdVoyageToVoyageView } from "@/lib/created-voyage-page";
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

export default function VoyageDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setVoyage(null);
      setLoading(false);
      return;
    }

    /** Carnet local : pas d’appel API (404 inutile + source de vérité = localStorage). */
    if (slug.toLowerCase().startsWith("created-")) {
      const fromLocal =
        getCreatedVoyageById(slug) ?? takeLastCreatedVoyageForSessionIfSlug(slug);
      if (fromLocal) {
        setVoyage(createdVoyageToVoyageView(fromLocal));
      } else {
        setVoyage(null);
      }
      setLoading(false);
      return;
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
          setVoyage(createdVoyageToVoyageView(local));
          return;
        }
        const sessionFallback = takeLastCreatedVoyageForSessionIfSlug(slug);
        if (sessionFallback) {
          setVoyage(createdVoyageToVoyageView(sessionFallback));
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
          setVoyage(createdVoyageToVoyageView(local));
        } else {
          const sessionFallback = takeLastCreatedVoyageForSessionIfSlug(slug);
          setVoyage(
            sessionFallback ? createdVoyageToVoyageView(sessionFallback) : null
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

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
