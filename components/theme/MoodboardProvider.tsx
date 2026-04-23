"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type MoodboardId =
  | "terracotta"
  | "nocturne"
  | "dune"
  | "foret"
  | "violet"
  | "ardoise"
  | "perle"
  | "lagon"
  | "turquoise";

export type MoodboardDefinition = {
  id: MoodboardId;
  label: string;
  sous_titre: string;
  swatches: [string, string, string];
};

export type FontPresetId =
  | "classique"
  | "editorial"
  | "magazine"
  | "instrument"
  | "pop-display"
  | "spectral-soft"
  | "studio"
  | "zine"
  | "jardin";

export type FontPresetDefinition = {
  id: FontPresetId;
  label: string;
  contentLabel: string;
  titleLabel: string;
};

export const MOODBOARDS: MoodboardDefinition[] = [
  {
    id: "terracotta",
    label: "Terracotta",
    sous_titre: "Sunset voyageur (défaut)",
    swatches: ["#2e2926", "#c94a4a", "#e07856"],
  },
  {
    id: "nocturne",
    label: "Nocturne",
    sous_titre: "Nuit profonde bleutée",
    swatches: ["#1c2230", "#262e3d", "#e07856"],
  },
  {
    id: "dune",
    label: "Dune",
    sous_titre: "Aube sable & cannelle",
    swatches: ["#f4e8d7", "#e3cfb3", "#c94a4a"],
  },
  {
    id: "foret",
    label: "Forêt",
    sous_titre: "Sapin cuivré",
    swatches: ["#1f2a22", "#334132", "#e07856"],
  },
  {
    id: "violet",
    label: "Minuit",
    sous_titre: "Violet mystique",
    swatches: ["#241c2e", "#392e45", "#e07856"],
  },
  {
    id: "ardoise",
    label: "Ardoise",
    sous_titre: "Marine graphite",
    swatches: ["#222a2f", "#364250", "#e07856"],
  },
  {
    id: "perle",
    label: "Perle",
    sous_titre: "Gris ciel clair",
    swatches: ["#eef1f4", "#d8dde3", "#e07856"],
  },
  {
    id: "lagon",
    label: "Lagon",
    sous_titre: "Bleu profond",
    swatches: ["#0f2a38", "#1c4456", "#e07856"],
  },
  {
    id: "turquoise",
    label: "Turquoise",
    sous_titre: "Bord de lagon",
    swatches: ["#123a3d", "#1f585d", "#e07856"],
  },
];

/**
 * Combinaisons + originales / éditoriales.
 * 1 classique conservée (Courier + Cormorant) puis 5 paires modernes
 * avec un fort caractère : serif éditorial, display géométrique, grotesque contemporain.
 */
export const FONT_PRESETS: FontPresetDefinition[] = [
  {
    id: "classique",
    label: "Classique",
    contentLabel: "Courier Prime",
    titleLabel: "Cormorant Garamond",
  },
  {
    id: "editorial",
    label: "Éditorial",
    contentLabel: "Bricolage Grotesque",
    titleLabel: "Fraunces",
  },
  {
    id: "magazine",
    label: "Magazine",
    contentLabel: "Inter Tight",
    titleLabel: "Playfair Display",
  },
  {
    id: "instrument",
    label: "Instrument",
    contentLabel: "Onest",
    titleLabel: "Instrument Serif",
  },
  {
    id: "pop-display",
    label: "Pop display",
    contentLabel: "Geist",
    titleLabel: "Unbounded",
  },
  {
    id: "spectral-soft",
    label: "Spectral soft",
    contentLabel: "Spectral",
    titleLabel: "Fraunces",
  },
  {
    id: "studio",
    label: "Studio",
    contentLabel: "DM Sans",
    titleLabel: "DM Serif Display",
  },
  {
    id: "zine",
    label: "Zine",
    contentLabel: "Archivo Narrow",
    titleLabel: "Archivo Black",
  },
  {
    id: "jardin",
    label: "Jardin",
    contentLabel: "Karla",
    titleLabel: "EB Garamond",
  },
];

const STORAGE_KEY = "viago.moodboard";
const FONT_STORAGE_KEY = "viago.fontPreset";
const DEFAULT_MOODBOARD: MoodboardId = "terracotta";
const DEFAULT_FONT_PRESET: FontPresetId = "classique";

type Ctx = {
  moodboard: MoodboardId;
  setMoodboard: (id: MoodboardId) => void;
  fontPreset: FontPresetId;
  setFontPreset: (id: FontPresetId) => void;
};

const MoodboardContext = createContext<Ctx | null>(null);

export function MoodboardProvider({ children }: { children: ReactNode }) {
  const [moodboard, setMoodboardState] = useState<MoodboardId>(() => {
    if (typeof window === "undefined") return DEFAULT_MOODBOARD;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw && isMoodboardId(raw) ? raw : DEFAULT_MOODBOARD;
    } catch {
      return DEFAULT_MOODBOARD;
    }
  });
  const [fontPreset, setFontPresetState] = useState<FontPresetId>(() => {
    if (typeof window === "undefined") return DEFAULT_FONT_PRESET;
    try {
      const raw = window.localStorage.getItem(FONT_STORAGE_KEY);
      return raw && isFontPresetId(raw) ? raw : DEFAULT_FONT_PRESET;
    } catch {
      return DEFAULT_FONT_PRESET;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-moodboard", moodboard);
  }, [moodboard]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-preset", fontPreset);
  }, [fontPreset]);

  const setMoodboard = useCallback((id: MoodboardId) => {
    setMoodboardState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Intentionnel : storage bloqué ≠ blocage du switch visuel.
    }
    document.documentElement.setAttribute("data-moodboard", id);
  }, []);

  const setFontPreset = useCallback((id: FontPresetId) => {
    setFontPresetState(id);
    try {
      window.localStorage.setItem(FONT_STORAGE_KEY, id);
    } catch {
      // no-op
    }
    document.documentElement.setAttribute("data-font-preset", id);
  }, []);

  return (
    <MoodboardContext.Provider
      value={{ moodboard, setMoodboard, fontPreset, setFontPreset }}
    >
      {children}
    </MoodboardContext.Provider>
  );
}

export function useMoodboard(): Ctx {
  const v = useContext(MoodboardContext);
  if (!v) {
    throw new Error("useMoodboard doit être utilisé à l'intérieur de <MoodboardProvider>");
  }
  return v;
}

function isMoodboardId(x: string): x is MoodboardId {
  return MOODBOARDS.some((m) => m.id === x);
}

function isFontPresetId(x: string): x is FontPresetId {
  return FONT_PRESETS.some((f) => f.id === x);
}

/** Script inline à injecter dans <head> pour éviter un flash au premier rendu. */
export const MOODBOARD_PRE_HYDRATION_SCRIPT = `
(function(){try{var k='viago.moodboard';var v=localStorage.getItem(k);var a=['terracotta','nocturne','dune','foret','violet','ardoise','perle','lagon','turquoise'];document.documentElement.setAttribute('data-moodboard',a.indexOf(v)>=0?v:'terracotta');}catch(e){document.documentElement.setAttribute('data-moodboard','terracotta');}})();
(function(){try{var k='viago.fontPreset';var v=localStorage.getItem(k);var a=['classique','editorial','magazine','instrument','pop-display','spectral-soft','studio','zine','jardin'];document.documentElement.setAttribute('data-font-preset',a.indexOf(v)>=0?v:'classique');}catch(e){document.documentElement.setAttribute('data-font-preset','classique');}})();
`;
