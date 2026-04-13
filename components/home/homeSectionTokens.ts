/** Sections plein viewport mobile + scroll aimanté (snap). */
export const SNAP_MAIN =
  "h-[100dvh] overflow-y-auto snap-y snap-mandatory overscroll-y-contain";

export const SNAP_SECTION =
  "min-h-[100dvh] max-h-[100dvh] h-[100dvh] shrink-0 snap-start snap-always flex flex-col overflow-hidden";

/** Zone scrollable si le contenu déborde (amis, listes). */
export const SNAP_SECTION_SCROLL_INNER =
  "flex min-h-0 flex-1 flex-col overflow-y-auto";

/** Titres de section — plus grands, occupent mieux la largeur. */
export const HOME_SECTION_H2 =
  "font-courier text-[1.85rem] font-bold uppercase leading-[1.08] tracking-wide sm:text-[2.15rem]";

/** Carte liste harmonisée (Mes voyages, Partages, etc.). */
export const HOME_LIST_CARD =
  "flex min-h-[5.25rem] w-full items-stretch gap-3 rounded-2xl border-2 border-[#E07856]/28 bg-white/95 p-3.5 shadow-[0_6px_24px_rgba(45,30,20,0.07)] transition hover:border-[#E07856]/48 hover:shadow-[0_8px_28px_rgba(224,120,86,0.12)]";

/** Carte liste sur fond dégradé brique / sombre chaud (aligné porte d’entrée). */
export const HOME_LIST_CARD_ON_DARK =
  "flex min-h-[5.25rem] w-full items-stretch gap-3 rounded-2xl border border-white/28 bg-white/12 p-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.22)] backdrop-blur-md transition hover:border-white/45 hover:bg-white/18";

/** Pastille icône / vignette (même taille partout). */
export const HOME_LIST_MEDIA_BOX =
  "flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#E07856]/12 to-[#CD853F]/18 ring-1 ring-[#E07856]/22";
