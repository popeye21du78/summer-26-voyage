import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import HomeDecorTitle from "@/components/home/HomeDecorTitle";
import { HOME_SECTION_H2 } from "@/components/home/homeSectionTokens";

export const INSPI_SURFACE_SHEET =
  "bg-[#141414]";

export const INSPI_SURFACE_CARD =
  "border border-white/6 bg-white/3 backdrop-blur-sm";

export const INSPI_TEXT_PRIMARY = "text-white/90";
export const INSPI_TEXT_MUTED = "text-white/50";
export const INSPI_ACCENT_LINE = "border-white/6";

export const INSPI_CTA_GRADIENT =
  "btn-orange-glow";

/** Titres de section — même impact que l’accueil. */
export { HOME_SECTION_H2 };

/** Filigrane 2 lignes à partir du nom (accents retirés pour le bloc). */
export function decorLinesFromRegionName(name: string): [string, string] {
  const u = name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (u.length <= 3) return [u, "VIAGO"];
  const mid = Math.ceil(u.length / 2);
  return [u.slice(0, mid), u.slice(mid)];
}

type RegionHeroProps = {
  imageSrc: string;
  regionName: string;
  onBack?: () => void;
  /** Sous-titre court sous le nom (accroche). */
  tagline?: string;
  /** Preview = bandeau moins haut ; full = hauteur immersive. */
  density?: "preview" | "full";
  /** Preview sheet : pas de retour (fermeture par geste). */
  showBackButton?: boolean;
};

/**
 * Hero carte / fiche région : image bord à bord sous la poignée, retour + logo en overlay
 * (même esprit que la landing : filigrane, brique, dynamisme).
 */
export function InspirationRegionHero({
  imageSrc,
  regionName,
  onBack,
  tagline,
  density = "full",
  showBackButton = true,
}: RegionHeroProps) {
  const [a, b] = decorLinesFromRegionName(regionName);
  const isFull = density === "full";

  return (
    <header className="relative w-full overflow-hidden bg-[#111111]">
      <div
        className={`relative w-full overflow-hidden ${isFull ? "h-[min(46vh,440px)] min-h-[300px] sm:h-[min(44vh,480px)]" : "h-[130px] sm:h-[148px]"}`}
      >
        <Image
          src={imageSrc}
          alt=""
          fill
          className="photo-bw-reveal object-cover"
          sizes="100vw"
          priority
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#111111]/90"
          aria-hidden
        />
        <HomeDecorTitle lines={[a, b]} tone="onDark" className="z-[1] opacity-90" />

        <div
          className={`absolute left-0 right-0 top-0 z-[2] flex items-start gap-2 px-3 pt-[max(0.35rem,env(safe-area-inset-top,0px))] sm:px-4 ${showBackButton ? "justify-between" : "justify-end"}`}
        >
          {showBackButton && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-black/50 px-2.5 py-1.5 font-courier text-[11px] font-bold uppercase tracking-wide text-white/80 shadow-lg backdrop-blur-md transition hover:bg-black/70"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              Retour
            </button>
          ) : (
            <span className="min-w-0 shrink" aria-hidden />
          )}
          <Image
            src="/A1.png"
            alt="Viago"
            width={28}
            height={28}
            className="shrink-0 opacity-50"
            style={{ filter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(-15deg)" }}
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-[2] px-4 pb-4 pt-16 sm:px-5">
          <p className="font-courier text-[10px] font-bold uppercase tracking-[0.35em] text-[#E07856]">
            Région
          </p>
          <h1
            className={`mt-1 max-w-[95%] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] ${HOME_SECTION_H2}`}
          >
            {regionName}
          </h1>
          {tagline ? (
            <p
              className={`mt-2 max-w-lg line-clamp-3 font-courier text-[13px] leading-snug sm:text-sm ${INSPI_TEXT_MUTED}`}
            >
              {tagline}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
