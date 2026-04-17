"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import { loadCreatedVoyages } from "@/lib/created-voyages";
import type { Voyage } from "@/data/mock-voyages";
import type { Step } from "@/types";
import VoyageDetailInteractive from "@/components/mon-espace/VoyageDetailInteractive";

const VoyageMapView = dynamic(() => import("./VoyageMapView"), { ssr: false });

export default function VoyageDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/voyage/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.voyage ?? d ?? null;
        if (v) {
          setVoyage(v);
        } else {
          const local = loadCreatedVoyages().find((cv) => cv.id === slug);
          if (local) {
            const steps: Step[] = local.steps.map((s) => ({
              id: s.id,
              nom: s.nom,
              coordonnees: {
                lat: s.lat ?? 46.2276,
                lng: s.lng ?? 2.2137,
              },
              date_prevue: s.date_prevue ?? "",
              description_culture: "",
              budget_prevu: 0,
              nuitee_type: s.type === "passage" ? "passage" : "van",
              contenu_voyage: { photos: [] },
            }));
            setVoyage({
              id: local.id,
              titre: local.titre,
              sousTitre: local.sousTitre,
              region: "France",
              dureeJours: steps.length,
              dateDebut: steps[0]?.date_prevue ?? "",
              steps,
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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
      <main className="flex h-full items-center justify-center bg-gradient-to-b from-[#2a1810] to-[#1a120d]">
        <p className="voyage-loading-text text-sm uppercase tracking-widest">
          voyage voyage…
        </p>
      </main>
    );
  }

  if (!voyage) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#2a1810] to-[#1a120d] px-6">
        <p className="font-courier text-sm text-white/50">Voyage introuvable.</p>
        <Link
          href="/mon-espace"
          className="font-courier text-xs font-bold text-[#E07856]"
        >
          Retour
        </Link>
      </main>
    );
  }

  return (
    <main className="flex h-full flex-col overflow-y-auto bg-gradient-to-b from-[#2a1810] to-[#1a120d]">
      <div className="relative h-[40vh] min-h-[260px] shrink-0">
        <VoyageMapView
          steps={stepCoords}
          mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#2a1810] to-transparent" />
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
