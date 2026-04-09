"use client";

/**
 * Bandeau de photos défilantes en arrière-plan.
 * Utilise des URLs absolues et une structure simple pour garantir l'affichage.
 */
const PHOTOS_FALLBACK = [
  { url: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800", nom: "Avignon" },
  { url: "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800", nom: "Gordes" },
  { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800", nom: "Roussillon" },
  { url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800", nom: "Cassis" },
  { url: "https://images.unsplash.com/photo-1578645510447-e2b6914c1d70?w=800", nom: "Marseille" },
];

export type PhotoItem = { url: string; nom: string };

type Props = {
  photos: PhotoItem[];
  /** Overlay gradient (terracotta par défaut) */
  overlay?: string;
  /**
   * Si true et aucune photo : fond dégradé seulement (pas les Unsplash de secours).
   * À utiliser pendant le chargement du batch lieu / Wikipédia.
   */
  suppressFallback?: boolean;
};

export default function HeroPhotoStrip({ photos, overlay, suppressFallback }: Props) {
  const items =
    photos.length > 0 ? photos : suppressFallback ? [] : PHOTOS_FALLBACK;
  const gradient =
    overlay ??
    "linear-gradient(to bottom, rgba(139,69,19,0.5) 0%, rgba(224,120,86,0.3) 50%, rgba(93,58,26,0.6) 100%)";

  if (items.length === 0) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden" style={{ minHeight: "100vh" }}>
        <div
          className="h-full min-h-screen w-full"
          style={{
            background:
              "linear-gradient(125deg, #4a2c14 0%, #6B3E1A 25%, #8B4513 50%, #A0522D 75%, #5D3A1A 100%)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 z-[1]"
          style={{ background: gradient }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" style={{ minHeight: "100vh" }}>
      {/* Strip défilant — structure simple, dimensions explicites */}
      <div className="flex h-full min-h-screen w-max animate-scroll-horizontal">
        {[...items, ...items].map((p, i) => (
          <div
            key={`${p.url}-${i}`}
            className="relative h-full shrink-0"
            style={{ minWidth: "50vw", width: "50vw" }}
          >
            <img
              src={p.url}
              alt=""
              className="h-full w-full object-cover object-center"
              style={{ display: "block", minHeight: "100vh" }}
              loading="eager"
            />
            <div
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
            />
            <div className="absolute bottom-4 left-4 right-4 font-courier text-sm font-bold text-white drop-shadow-lg">
              {p.nom}
            </div>
          </div>
        ))}
      </div>
      {/* Voile terracotta */}
      <div
        className="absolute inset-0 z-[1]"
        style={{ background: gradient }}
      />
    </div>
  );
}
