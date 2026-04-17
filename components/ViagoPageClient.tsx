"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Route, Fuel } from "lucide-react";
import ViagoSection from "./ViagoSection";
import { LieuResolvedBackground } from "./LieuResolvedBackground";
import { mergeVoyageSteps } from "@/lib/voyage-local-overrides";
import { getCreatedVoyageById, createdVoyageToViagoPayload } from "@/lib/created-voyages";
import { getProfileIdCached } from "@/lib/me-client";
import type { Step } from "@/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ViagoPageClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const readOnly = searchParams.get("mode") === "readonly";

  const backHref = readOnly ? "/inspirer?tab=amis" : `/mon-espace/voyage/${id}`;

  const [voyage, setVoyage] = useState<{
    id: string;
    titre: string;
    sousTitre?: string;
    steps: Step[];
    stats?: { km?: number; essence?: number; budget?: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageScope, setStorageScope] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      const [vRes, meRes] = await Promise.all([
        fetch(`/api/voyage/${id}`),
        fetch("/api/me"),
      ]);
      const data = vRes.ok ? await vRes.json().catch(() => null) : null;
      const me = meRes.ok ? await meRes.json().catch(() => null) : null;
      if (cancelled) return;

      const scope: string | null =
        data?.ownerProfileId && typeof data.ownerProfileId === "string"
          ? data.ownerProfileId
          : typeof me?.profileId === "string"
            ? me.profileId
            : null;
      setStorageScope(scope);

      if (data && !data.error) {
        const { isOwner: _o, ownerName: _n, ownerProfileId: _p, ...rest } = data;
        setVoyage(rest);
      } else {
        const local = getCreatedVoyageById(id);
        setVoyage(local ? createdVoyageToViagoPayload(local) : null);
      }
      setLoading(false);
    })().catch(async () => {
      if (cancelled) return;
      try {
        const pid = await getProfileIdCached();
        if (!cancelled && pid) setStorageScope(pid);
      } catch {
        /* ignore */
      }
      const local = getCreatedVoyageById(id);
      setVoyage(local ? createdVoyageToViagoPayload(local) : null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const mergedSteps = useMemo(() => {
    if (!voyage?.steps) return [];
    return mergeVoyageSteps(voyage.steps, voyage.id);
  }, [voyage]);

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <main className="flex min-h-[40vh] flex-1 items-center justify-center bg-[#1a1a1a]">
          <p className="font-courier text-white/70">Chargement…</p>
        </main>
      </div>
    );
  }

  if (!voyage) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto bg-[#1a1a1a] px-4 py-8">
          <p className="font-courier text-center text-white/80">Viago indisponible pour ce voyage.</p>
          <Link
            href="/mon-espace"
            className="font-courier text-[#E07856] underline transition-all hover:no-underline"
          >
            Retour à Mon espace
          </Link>
        </main>
      </div>
    );
  }

  const dateDebut = mergedSteps[0]?.date_prevue;
  const dateFin =
    mergedSteps[mergedSteps.length - 1]?.date_prevue ?? dateDebut;
  const first = mergedSteps[0];

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-[#0d0d0d]">
        <header className="relative flex min-h-[60vh] flex-col justify-end overflow-hidden">
          {first ? (
            <LieuResolvedBackground
              key={`${voyage.id}-${first.id}`}
              ville={first.nom}
              stepId={first.id}
              className="absolute inset-0 transition-transform duration-700 hover:scale-105"
            />
          ) : (
            <div
              className="absolute inset-0 bg-gradient-to-br from-[#5D3A1A] via-[#8B4513] to-[#A0522D]"
              aria-hidden
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/40 to-transparent" />
          <div className="absolute inset-0 bg-[#E07856]/20" />
          <div className="relative z-10 px-4 pb-12 pt-24 md:px-8 md:pb-16">
            <Link
              href={backHref}
              replace
              className="mb-6 inline-flex items-center gap-2 font-courier text-sm font-bold text-white/90 transition-all duration-300 hover:scale-105 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
            <h1 className="font-courier text-4xl font-bold tracking-wider text-white drop-shadow-2xl md:text-6xl">
              {voyage.titre}
            </h1>
            <p className="mt-2 font-courier text-lg font-bold text-[#E07856]">
              {voyage.sousTitre}
            </p>
            <p className="mt-2 font-courier text-sm text-white/80">
              {dateDebut && dateFin
                ? `${formatDate(dateDebut)} → ${formatDate(dateFin)}`
                : ""}
            </p>
            {voyage.stats && (
              <div className="mt-6 flex gap-8">
                {voyage.stats.km != null && (
                  <span className="flex items-center gap-2 font-courier font-bold text-[#E07856]">
                    <Route className="h-5 w-5" />
                    {voyage.stats.km} km
                  </span>
                )}
                {voyage.stats.essence != null && (
                  <span className="flex items-center gap-2 font-courier font-bold text-[#E07856]">
                    <Fuel className="h-5 w-5" />
                    {voyage.stats.essence} € essence
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        <div>
          {mergedSteps.map((step, i) => (
            <ViagoSection
              key={step.id}
              step={step}
              voyageId={voyage.id}
              index={i}
              readOnly={readOnly}
              variant={i % 2 === 0 ? "dark" : "light"}
              storageScope={storageScope}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
