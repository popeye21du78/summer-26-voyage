"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  MapPin,
  Users,
  Eye,
  EyeOff,
  Camera,
  MessageCircle,
  Moon,
  Navigation,
} from "lucide-react";
import { CityPhoto } from "@/components/CityPhoto";
import { loadCreatedVoyages } from "@/lib/created-voyages";
import type { Voyage } from "@/data/mock-voyages";
import type { Step } from "@/types";

const VoyageMapView = dynamic(() => import("./VoyageMapView"), { ssr: false });

type Visibility = "private" | "friends" | "public";

export default function VoyageDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState<Visibility>("friends");

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
      {/* Map */}
      <div className="relative h-[40vh] min-h-[260px] shrink-0">
        <VoyageMapView
          steps={stepCoords}
          mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#2a1810] to-transparent" />
        <Link
          href="/mon-espace"
          className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 font-courier text-xs font-bold text-white backdrop-blur-sm transition hover:bg-black/60"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </Link>
      </div>

      {/* Content */}
      <div className="px-5 pb-8">
        <h1 className="font-courier text-2xl font-bold text-white">
          {voyage.titre}
        </h1>
        <p className="mt-1 font-courier text-sm text-white/45">
          {voyage.sousTitre}
        </p>

        {/* Quick settings */}
        <section className="mt-5 space-y-2.5">
          <SettingRow
            icon={<Camera className="h-4 w-4 text-[#E07856]/60" />}
            label="Photo de couverture"
            action="Modifier"
          />
          <SettingRow
            icon={<Users className="h-4 w-4 text-[#E07856]/60" />}
            label="Compagnons"
            action="Inviter"
          />
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center gap-2">
              {visibility === "public" ? (
                <Eye className="h-4 w-4 text-[#E07856]/60" />
              ) : (
                <EyeOff className="h-4 w-4 text-[#E07856]/60" />
              )}
              <span className="font-courier text-xs text-white/50">
                Visibilité
              </span>
            </div>
            <div className="flex gap-1">
              {(["private", "friends", "public"] as Visibility[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`rounded-full px-2 py-0.5 font-courier text-[9px] font-bold uppercase tracking-wider transition ${
                    visibility === v
                      ? "bg-[#E07856] text-white"
                      : "text-white/30 hover:text-white/50"
                  }`}
                >
                  {v === "private"
                    ? "Privé"
                    : v === "friends"
                      ? "Amis"
                      : "Public"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Steps with city photos */}
        <section className="mt-6">
          <h2 className="mb-3 font-courier text-sm font-bold uppercase tracking-wider text-[#E07856]">
            Étapes
          </h2>
          <div className="space-y-3">
            {voyage.steps.map((s, i) => {
              const isNuit = s.nuitee_type !== "passage";
              return (
                <div
                  key={s.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                >
                  <div className="relative h-28">
                    <CityPhoto
                      stepId={s.id}
                      ville={s.nom}
                      initialUrl={s.contenu_voyage?.photos?.[0]}
                      alt={s.nom}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-3">
                      <div>
                        <p className="font-courier text-sm font-bold text-white">
                          {s.nom}
                        </p>
                        <p className="font-courier text-[10px] text-white/50">
                          {s.date_prevue}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E07856]/80 font-courier text-[9px] font-bold text-white">
                          {i + 1}
                        </span>
                        {isNuit ? (
                          <Moon className="h-3.5 w-3.5 text-[#E07856]/70" />
                        ) : (
                          <Navigation className="h-3.5 w-3.5 text-[#E07856]/70" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Viago link */}
        <Link
          href={`/mon-espace/viago/${voyage.id}`}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E07856] to-[#c94a4a] py-3.5 font-courier text-sm font-bold text-white shadow-[0_8px_28px_rgba(224,120,86,0.4)] transition hover:brightness-105"
        >
          <MessageCircle className="h-4 w-4" />
          Ouvrir le Viago
        </Link>
      </div>
    </main>
  );
}

function SettingRow({
  icon,
  label,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  action: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-courier text-xs text-white/50">{label}</span>
      </div>
      <button className="font-courier text-[10px] font-bold text-[#E07856]">
        {action}
      </button>
    </div>
  );
}
