"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { adaptText } from "../lib/ville-adaptation";
import { readReturnTo } from "@/lib/return-to";
import type { ProfilVille } from "../lib/ville-adaptation";
import PlaceAffinityActions from "@/components/planifier/inspiration/PlaceAffinityActions";

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
  const fromParam = searchParams.get("from");
  const fromVoyage = fromParam === "voyage";
  const fromInspiration = fromParam === "inspiration";
  const fromRegion = fromParam === "region";
  const fromStars = fromParam === "stars";
  const fromItineraire = fromParam === "itineraire";
  const regionParam = searchParams.get("region");
  const voyagePrevuSlug = searchParams.get("v");
  const returnToOverride = readReturnTo(searchParams);
  const backToVoyageCarte =
    voyagePrevuSlug && /^[a-zA-Z0-9_-]+$/.test(voyagePrevuSlug)
      ? `/voyage/${voyagePrevuSlug}/prevu#carte-voyage`
      : null;

  const [profil, setProfil] = useState<ProfilVille | null>(null);
  const [commonsData, setCommonsData] = useState<CommonsPhotosData | null>(null);
  const [commonsLoading, setCommonsLoading] = useState(false);
  const [commonsError, setCommonsError] = useState<string | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  useEffect(() => {
    setProfil(getProfilFromSession());
  }, []);

  /** Photo hero : chargement auto (même source que le bouton Commons) */
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/commons-photos?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: (CommonsPhotosData & { error?: string }) | null) => {
        if (
          cancelled ||
          !data?.header?.[0]?.url ||
          typeof data.header[0].url !== "string"
        )
          return;
        setHeroUrl(data.header[0].url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const effectiveProfil = useMemo(() => profil ?? PROFIL_TEST, [profil]);
  const adapted = useMemo(
    () => adaptText(description, effectiveProfil),
    [description, effectiveProfil]
  );
  const lines = adapted.split("\n");

  /** Découpe en blocs : texte avant 1re section, puis sections titre + lignes */
  const structuredSections = useMemo(() => {
    type Block = { title: string | null; lines: string[] };
    const raw: Block[] = [];
    let cur: Block = { title: null, lines: [] };
    for (const line of lines) {
      const t = line.trim();
      if (
        t.startsWith("---") &&
        t.endsWith("---") &&
        t.replace(/-/g, "").length > 0
      ) {
        const title = t
          .replace(/^\s*---\s*/, "")
          .replace(/\s*---\s*$/, "")
          .replace(/_/g, " ")
          .trim();
        if (cur.lines.length > 0 || cur.title) raw.push(cur);
        cur = { title, lines: [] };
      } else {
        cur.lines.push(line);
      }
    }
    if (cur.lines.length > 0 || cur.title) raw.push(cur);

    /** Sans titre : découpe sur doubles sauts de ligne pour alterner les fonds */
    const out: Block[] = [];
    for (const b of raw) {
      if (b.title) {
        out.push(b);
        continue;
      }
      const joined = b.lines.join("\n");
      const parts = joined.split(/\n\n+/).filter((p) => p.trim().length > 0);
      if (parts.length <= 1) {
        out.push(b);
        continue;
      }
      for (const p of parts) {
        out.push({ title: null, lines: p.split("\n") });
      }
    }
    return out;
  }, [lines]);

  const hasCommonsBlock = Boolean(commonsData?.header?.length);

  const bandDark =
    "border border-[var(--color-glass-border)] bg-[var(--color-bg-secondary)]";
  const bandLight =
    "border border-[var(--color-glass-border)] bg-[var(--color-bg-tertiary)]";

  const bandForContentIndex = (i: number) =>
    i % 2 === 0 ? bandDark : bandLight;
  const toneForContentIndex = (i: number) =>
    i % 2 === 0 ? ("dark" as const) : ("light" as const);
  const contentIndexForSection = (si: number) =>
    si + (hasCommonsBlock ? 1 : 0);
  const photoSectionStartIndex =
    structuredSections.length + (hasCommonsBlock ? 1 : 0);

  const backHref =
    returnToOverride ??
    backToVoyageCarte ??
    (fromRegion && regionParam
      ? `/inspirer/region/${regionParam}`
      : fromStars
        ? `/inspirer?tab=stars${regionParam ? `&region=${regionParam}` : ""}`
        : fromItineraire
          ? "/inspirer?tab=stars"
          : fromVoyage
            ? "/planifier/commencer"
            : fromInspiration
              ? "/planifier/inspiration"
              : "/inspirer");

  const loadCommonsPhotos = async () => {
    setCommonsLoading(true);
    setCommonsError(null);
    try {
      const res = await fetch(`/api/commons-photos?slug=${encodeURIComponent(slug)}`);
      const text = await res.text();
      const parsed = text?.trim()
        ? (JSON.parse(text) as CommonsPhotosData & { error?: string })
        : null;
      if (!res.ok) throw new Error(parsed?.error ?? `Erreur ${res.status}`);
      if (!parsed) throw new Error("Réponse vide");
      setCommonsData(parsed);
      if (parsed.header?.[0]?.url) setHeroUrl(parsed.header[0].url);
    } catch (e) {
      setCommonsError(e instanceof Error ? e.message : "Erreur lors du chargement");
    } finally {
      setCommonsLoading(false);
    }
  };

  const lineVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: Math.min(i * 0.04, 0.6),
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    }),
  };

  function renderRichParagraphs(
    blockLines: string[],
    baseKey: string,
    tone: "dark" | "light" = "light"
  ) {
    const isDark = tone === "dark";
    return blockLines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("• "))
        return (
          <motion.p
            key={`${baseKey}-b-${i}`}
            custom={i}
            variants={lineVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-20px" }}
            className={
              isDark
                ? "border-l-2 border-white/35 py-2 pl-4 text-[15px] leading-relaxed text-white/90"
                : "viago-border-l-accent-soft py-2 pl-4 text-[15px] leading-relaxed text-white/75"
            }
          >
            {trimmed}
          </motion.p>
        );
      return (
        <motion.p
          key={`${baseKey}-p-${i}`}
          custom={i}
          variants={lineVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-20px" }}
          className={
            isDark
              ? "py-2 text-[15px] leading-[1.75] text-white/88"
              : "py-2 text-[15px] leading-[1.75] text-white/70"
          }
        >
          {trimmed.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) => {
            if (chunk.startsWith("**") && chunk.endsWith("**")) {
              const inner = chunk.slice(2, -2);
              return (
                <span
                  key={j}
                  className={
                    isDark ? "font-semibold viago-text-gold-soft" : "font-semibold text-gradient-viago-title"
                  }
                >
                  {inner}
                </span>
              );
            }
            return <span key={j}>{chunk}</span>;
          })}
        </motion.p>
      );
    });
  }

  return (
    <main className="relative isolate !pt-0 overflow-x-hidden overflow-y-auto bg-[var(--color-bg-main)] pb-20">
      {/* Hero plein viewport : largeur 100%, image dès le haut (sous le header fixe) */}
      <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
        <div className="relative min-h-[min(52vh,420px)] h-[min(56vh,480px)] w-full overflow-hidden bg-[var(--color-bg-main)] sm:min-h-[380px]">
          {heroUrl ? (
            <Image
              src={heroUrl}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority
              unoptimized
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom right, color-mix(in srgb, var(--color-accent-start) 32%, transparent), var(--color-bg-secondary), var(--color-bg-main))`,
              }}
            />
          )}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(to top, var(--color-bg-main), color-mix(in srgb, var(--color-bg-main) 48%, transparent), transparent)`,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, color-mix(in srgb, var(--color-bg-main) 35%, transparent), transparent, transparent)`,
            }}
          />
          <Link
            href={backHref}
            className="viago-glass-card absolute top-[calc(var(--header-content-offset)+0.35rem)] left-4 z-20 inline-flex items-center gap-2 px-3 py-1.5 font-courier text-xs font-bold text-[var(--color-text-primary)] shadow-md transition hover:brightness-110 md:left-6"
          >
            ←{" "}
            {backToVoyageCarte
              ? "Voyage"
              : fromRegion
                ? "Région"
                : fromStars || fromItineraire
                  ? "Stars"
                  : fromInspiration
                    ? "Inspiration"
                    : "Retour"}
          </Link>
          <div
            className="pointer-events-none absolute inset-0 z-[15] flex flex-col items-center justify-center px-5 text-center"
            style={{
              background: `linear-gradient(to top, color-mix(in srgb, var(--color-bg-main) 72%, transparent), color-mix(in srgb, var(--color-bg-main) 22%, transparent), color-mix(in srgb, var(--color-bg-main) 32%, transparent))`,
            }}
          >
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="text-gradient-viago-title-alt max-w-[95%] break-words font-courier text-3xl font-bold tracking-wider drop-shadow-[0_2px_24px_var(--color-shadow)] md:text-5xl"
            >
              {nom}
            </motion.h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-6">
      <div className="mb-4">
        <PlaceAffinityActions placeSlug={slug} placeLabel={nom} />
      </div>

      {hasPhotosFolder && (
        <div className="mb-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={loadCommonsPhotos}
            disabled={commonsLoading}
            className="btn-orange-glow self-start rounded-full px-5 py-2.5 font-courier text-sm font-bold text-white disabled:opacity-50"
          >
            {commonsLoading ? "Chargement…" : "Charger / rafraîchir photos Commons"}
          </button>
          {commonsError && (
            <p className="text-sm text-red-600">{commonsError}</p>
          )}
        </div>
      )}

      {commonsData?.header && commonsData.header.length > 0 && (
        <section
          className={`mb-10 rounded-xl px-4 py-6 ${bandForContentIndex(0)}`}
        >
          <h2
            className={`mb-3 text-xs font-bold uppercase tracking-wider ${
              toneForContentIndex(0) === "dark"
                ? "text-white/80"
                : "text-[var(--color-accent-start)] opacity-90"
            }`}
          >
            Autres visuels
          </h2>
          <div className="flex flex-col gap-4">
            {commonsData.header.map((photo, i) => (
              <PhotoCandidate
                key={i}
                photo={photo}
                rank={i + 1}
                tone={toneForContentIndex(0)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Description : sections déroulantes + alternance de fonds */}
      <div className="space-y-4">
        {structuredSections.map((sec, si) => {
          const idx = contentIndexForSection(si);
          const band = bandForContentIndex(idx);
          const tone = toneForContentIndex(idx);

          if (!sec.title) {
            return (
              <div key={`open-${si}`} className={`rounded-xl px-4 py-4 ${band}`}>
                {renderRichParagraphs(sec.lines, `open-${si}`, tone)}
              </div>
            );
          }

          return (
            <details
              key={`det-${si}`}
              className={`group overflow-hidden rounded-xl ${band}`}
              open={si < 2}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-courier text-base font-bold [&::-webkit-details-marker]:hidden">
                {tone === "dark" ? (
                  <span className="text-left text-white">{sec.title}</span>
                ) : (
                  <span className="text-gradient-viago-title text-left">
                    {sec.title}
                  </span>
                )}
                <span
                  className={`shrink-0 transition-transform duration-200 group-open:-rotate-180 ${
                    tone === "dark" ? "text-white/70" : "text-[var(--color-accent-start)]"
                  }`}
                >
                  ▼
                </span>
              </summary>
              <div
                className={`border-t px-4 py-3 ${
                  tone === "dark" ? "border-white/15" : "viago-border-t-accent-faint"
                }`}
              >
                {renderRichParagraphs(sec.lines, `det-${si}`, tone)}
              </div>
            </details>
          );
        })}
      </div>

      <div className="mt-12 space-y-8">
        {photoSlots.length > 0 ? (
          photoSlots.map((label, idx) => {
            const lieuData = commonsData?.lieux?.[idx];
            const photos = lieuData?.photos ?? [];

            const slotIdx = photoSectionStartIndex + idx;
            const slotBand = bandForContentIndex(slotIdx);
            const slotTone = toneForContentIndex(slotIdx);

            return (
              <section
                key={idx}
                className={`scroll-mt-24 rounded-xl p-5 ${slotBand}`}
              >
                <h2
                  className={`mb-3 font-courier text-sm font-bold uppercase tracking-wider ${
                    slotTone === "dark" ? "text-white/85" : "text-[var(--color-accent-start)]"
                  }`}
                >
                  {label}
                </h2>
                {photos.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {photos.map((photo, j) => (
                      <PhotoCandidate
                        key={j}
                        photo={photo}
                        rank={j + 1}
                        tone={slotTone}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    className={`flex aspect-video items-center justify-center rounded-xl border-2 border-dashed text-sm ${
                      slotTone === "dark"
                        ? "border-white/10 viago-bg-scrim-light text-white/40"
                        : "border-white/8 bg-[var(--color-bg-secondary)] text-white/35"
                    }`}
                  >
                    {commonsData ? "Aucun résultat" : "Utilise « Charger photos Commons »"}
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
                className="flex aspect-video items-center justify-center rounded-xl border-2 border-dashed border-white/8 bg-[var(--color-bg-secondary)] text-sm text-white/30"
              >
                Photo {n}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </main>
  );
}

function PhotoCandidate({
  photo,
  rank,
  tone = "light",
}: {
  photo: CommonsPhoto;
  rank: number;
  tone?: "dark" | "light";
}) {
  const dark = tone === "dark";
  return (
    <div className="overflow-hidden rounded-lg">
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
      <div
        className={`border-t px-1 py-2 text-xs ${
          dark
            ? "border-white/6 bg-[color-mix(in_srgb,var(--color-bg-main)_40%,transparent)] text-white/60"
            : "border-white/6 bg-[var(--color-bg-secondary)] text-white/50"
        }`}
      >
        <div className={`font-medium ${dark ? "text-white/95" : "text-white/80"}`}>
          Candidat {rank}
        </div>
        <div>
          {photo.author} • {photo.license}
        </div>
        <a
          href={photo.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-1 inline-block font-medium underline hover:no-underline ${
            dark ? "viago-text-gold-soft" : "text-[var(--color-accent-start)]"
          }`}
        >
          Source Commons
        </a>
      </div>
    </div>
  );
}
