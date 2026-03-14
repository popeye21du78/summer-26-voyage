"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { adaptText } from "../lib/ville-adaptation";
import type { ProfilVille } from "../lib/ville-adaptation";

const SESSION_KEY = "voyage_profil_ville";

const PROFIL_TEST: ProfilVille = {
  genre: "homme",
  typePartenaire: "famille",
  prenom: "Jean",
  pluriel: true,
  nbEnfants: 2,
  partenaire: { prenom: "Marie", genre: "femme" },
  enfants: ["Léo", "Emma"],
};

function getProfilFromSession(): ProfilVille | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfilVille;
    if (parsed?.typePartenaire && parsed?.genre) return parsed;
  } catch {
    // ignorer
  }
  return null;
}

export interface CommonsPhoto {
  url: string;
  sourceUrl: string;
  title: string;
  width: number;
  height: number;
  size: number;
  timestamp: string;
  author: string;
  license: string;
  licenseUrl: string;
  score: number;
}

export interface CommonsPhotosData {
  header: CommonsPhoto[];
  lieux: { label: string; photos: CommonsPhoto[] }[];
}

export function VilleDescriptionClient({
  slug,
  nom,
  description,
  hasPhotosFolder = false,
  photoSlots = [],
}: {
  slug: string;
  nom: string;
  description: string;
  hasPhotosFolder?: boolean;
  photoSlots?: string[];
}) {
  const searchParams = useSearchParams();
  const fromVoyage = searchParams.get("from") === "voyage";

  const [profil, setProfil] = useState<ProfilVille | null>(null);
  const [commonsData, setCommonsData] = useState<CommonsPhotosData | null>(null);
  const [commonsLoading, setCommonsLoading] = useState(false);
  const [commonsError, setCommonsError] = useState<string | null>(null);

  useEffect(() => {
    setProfil(getProfilFromSession());
  }, []);

  const effectiveProfil = useMemo(() => profil ?? PROFIL_TEST, [profil]);
  const adapted = useMemo(
    () => adaptText(description, effectiveProfil),
    [description, effectiveProfil]
  );
  const lines = adapted.split("\n");

  const backHref = fromVoyage ? "/voyage/nouveau" : "/carte-villes";

  const loadCommonsPhotos = async () => {
    setCommonsLoading(true);
    setCommonsError(null);
    try {
      const res = await fetch(`/api/commons-photos?slug=${encodeURIComponent(slug)}`);
      const text = await res.text();
      const parsed = text?.trim() ? (JSON.parse(text) as CommonsPhotosData & { error?: string }) : null;
      if (!res.ok) throw new Error(parsed?.error ?? `Erreur ${res.status}`);
      if (!parsed) throw new Error("Réponse vide");
      setCommonsData(parsed);
    } catch (e) {
      setCommonsError(e instanceof Error ? e.message : "Erreur lors du chargement");
    } finally {
      setCommonsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-2 text-sm text-[#A55734] transition-colors hover:text-[#8b4728]"
      >
        ← Retour à la carte
      </Link>

      {/* Header : dégradé + optionnellement photos Commons */}
      <div className="relative h-[50vh] min-h-[280px] max-h-[400px] w-full overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#A55734]/20 to-[#8B6914]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg md:text-4xl">
            {nom}
          </h1>
        </div>
      </div>

      {/* Bouton Charger photos Commons (si dossier photos existe) */}
      {hasPhotosFolder && (
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={loadCommonsPhotos}
            disabled={commonsLoading}
            className="self-start rounded-lg bg-[#A55734] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8b4728] disabled:opacity-50"
          >
            {commonsLoading ? "Chargement…" : "Charger photos Commons"}
          </button>
          {commonsError && (
            <p className="text-sm text-red-600">{commonsError}</p>
          )}
        </div>
      )}

      {/* Photos header Commons (3 candidats) */}
      {commonsData?.header && commonsData.header.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#A55734]/80">
            Header — 3 candidats
          </h2>
          <div className="flex flex-col gap-4">
            {commonsData.header.map((photo, i) => (
              <PhotoCandidate key={i} photo={photo} rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Description */}
      <div className="mt-6 space-y-2 px-1">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          if (trimmed.startsWith("---") && trimmed.endsWith("---")) {
            const title = trimmed.replace(/---/g, "").replace(/_/g, " ");
            return (
              <h2 key={i} className="mt-8 text-lg font-semibold text-[#A55734]">
                {title}
              </h2>
            );
          }
          if (trimmed.startsWith("• "))
            return (
              <p key={i} className="pl-4 text-sm text-[#333]/90">
                {trimmed}
              </p>
            );
          return (
            <p key={i} className="leading-relaxed text-[#333]/90">
              {trimmed}
            </p>
          );
        })}
      </div>

      {/* Photos lieux : placeholders ou candidats Commons */}
      <div className="mt-10 space-y-6">
        {photoSlots.length > 0 ? (
          photoSlots.map((label, idx) => {
            const lieuData = commonsData?.lieux?.[idx];
            const photos = lieuData?.photos ?? [];

            return (
              <section key={idx}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#A55734]/80">
                  {label}
                </h2>
                {photos.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {photos.map((photo, i) => (
                      <PhotoCandidate key={i} photo={photo} rank={i + 1} />
                    ))}
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-[#A55734]/30 bg-[#FFF2EB]/30 text-sm text-[#333]/50">
                    {commonsData ? "Aucun résultat" : "Cliquer « Charger photos Commons »"}
                  </div>
                )}
              </section>
            );
          })
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-[#A55734]/30 bg-[#FFF2EB]/30 text-sm text-[#333]/50"
              >
                Photo {n} (placeholder)
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function PhotoCandidate({
  photo,
  rank,
}: {
  photo: CommonsPhoto;
  rank: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#A55734]/20 bg-white">
      <div className="relative aspect-video w-full">
        <Image
          src={photo.url}
          alt={photo.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 672px"
          unoptimized
        />
      </div>
      <div className="border-t border-[#A55734]/10 bg-[#FFF2EB]/30 px-3 py-2 text-xs text-[#333]/80">
        <div className="font-medium text-[#333]">Candidat {rank}</div>
        <div>
          {photo.author} • {photo.license}
        </div>
        <a
          href={photo.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-[#A55734] underline hover:no-underline"
        >
          Source Commons
        </a>
      </div>
    </div>
  );
}
