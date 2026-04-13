"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  InspirationAmbianceFilter,
  InspirationDurationFilter,
} from "@/lib/editorial-territories";
import type { InspirationStackEntry } from "@/types/inspiration";

type InspirationMapContextValue = {
  stack: InspirationStackEntry[];
  top: InspirationStackEntry;
  /** Filtres (inchangés vs ancienne page). */
  ambiance: InspirationAmbianceFilter[];
  duration: InspirationDurationFilter | null;
  setAmbiance: (v: InspirationAmbianceFilter[] | ((p: InspirationAmbianceFilter[]) => InspirationAmbianceFilter[])) => void;
  setDuration: (v: InspirationDurationFilter | null) => void;
  /** Recherche libre (carousel / régions). */
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterSheetOpen: boolean;
  setFilterSheetOpen: (v: boolean) => void;
  selectRegion: (regionId: string) => void;
  goExploreRegion: () => void;
  /** Carte régionale plein écran — empile un état, `closeRegionMapFullscreen` restaure l’écran précédent. */
  openRegionMapFullscreen: () => void;
  closeRegionMapFullscreen: () => void;
  openStarList: () => void;
  selectStarItinerary: (itineraryId: string) => void;
  selectEditorialStarItinerary: (editorialSlug: string) => void;
  selectTerritoryPoi: (territoryId: string) => void;
  goBack: () => void;
  resetFrance: () => void;
  /** Liste itinéraires stars : tracé carte uniquement pour ce slug (après choix thème + durée). */
  starListPreviewLineSlug: string | null;
  setStarListPreviewLineSlug: (slug: string | null) => void;
};

const Ctx = createContext<InspirationMapContextValue | null>(null);

export function InspirationMapProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<InspirationStackEntry[]>([{ screen: "france" }]);
  const [ambiance, setAmbiance] = useState<InspirationAmbianceFilter[]>([]);
  const [duration, setDuration] = useState<InspirationDurationFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [starListPreviewLineSlug, setStarListPreviewLineSlug] = useState<string | null>(null);

  const top = stack[stack.length - 1] ?? { screen: "france" as const };

  useEffect(() => {
    if (top.screen !== "star-list") {
      setStarListPreviewLineSlug(null);
    }
  }, [top.screen]);

  const selectRegion = useCallback((regionId: string) => {
    setStack([{ screen: "france" }, { screen: "region-preview", regionId }]);
  }, []);

  /** Passe en exploration régionale (remplace la preview par un état fiable). */
  /** Depuis la preview : pousse l’état « full région » pour permettre retour swipe → preview. */
  const goExploreRegion = useCallback(() => {
    setStack((s) => {
      const last = s[s.length - 1];
      if (last?.screen !== "region-preview") return s;
      return [...s, { screen: "region-explore", regionId: last.regionId }];
    });
  }, []);

  const openRegionMapFullscreen = useCallback(() => {
    setStack((s) => {
      const last = s[s.length - 1];
      if (last?.screen !== "region-preview" && last?.screen !== "region-explore") return s;
      return [...s, { screen: "region-map-fullscreen", regionId: last.regionId }];
    });
  }, []);

  const closeRegionMapFullscreen = useCallback(() => {
    setStack((s) => {
      const last = s[s.length - 1];
      if (last?.screen !== "region-map-fullscreen") return s;
      return s.slice(0, -1);
    });
  }, []);

  const openStarList = useCallback(() => {
    setStack((s) => {
      const last = s[s.length - 1];
      if (
        last?.screen !== "region-preview" &&
        last?.screen !== "region-explore"
      ) {
        return s;
      }
      return [...s, { screen: "star-list", regionId: last.regionId }];
    });
  }, []);

  const selectStarItinerary = useCallback((itineraryId: string) => {
    setStack((s) => {
      const last = s[s.length - 1];
      if (last?.screen === "star-list") {
        return [
          ...s,
          {
            screen: "star-detail",
            regionId: last.regionId,
            kind: "legacy",
            itineraryId,
          },
        ];
      }
      return s;
    });
  }, []);

  const selectEditorialStarItinerary = useCallback((editorialSlug: string) => {
    setStack((s) => {
      const last = s[s.length - 1];
      if (last?.screen === "star-list") {
        return [
          ...s,
          {
            screen: "star-detail",
            regionId: last.regionId,
            kind: "editorial",
            editorialSlug,
          },
        ];
      }
      return s;
    });
  }, []);

  const selectTerritoryPoi = useCallback((territoryId: string) => {
    setStack((s) => {
      const last = s[s.length - 1];
      if (last?.screen !== "region-explore") return s;
      return [
        ...s,
        { screen: "poi-detail", regionId: last.regionId, territoryId },
      ];
    });
  }, []);

  const goBack = useCallback(() => {
    setStack((s) => (s.length <= 1 ? s : s.slice(0, -1)));
  }, []);

  const resetFrance = useCallback(() => {
    setStack([{ screen: "france" }]);
  }, []);

  const value = useMemo<InspirationMapContextValue>(
    () => ({
      stack,
      top,
      ambiance,
      duration,
      setAmbiance,
      setDuration,
      searchQuery,
      setSearchQuery,
      filterSheetOpen,
      setFilterSheetOpen,
      selectRegion,
      goExploreRegion,
      openRegionMapFullscreen,
      closeRegionMapFullscreen,
      openStarList,
      selectStarItinerary,
      selectEditorialStarItinerary,
      selectTerritoryPoi,
      goBack,
      resetFrance,
      starListPreviewLineSlug,
      setStarListPreviewLineSlug,
    }),
    [
      stack,
      top,
      ambiance,
      duration,
      searchQuery,
      filterSheetOpen,
      starListPreviewLineSlug,
      selectRegion,
      goExploreRegion,
      openRegionMapFullscreen,
      closeRegionMapFullscreen,
      openStarList,
      selectStarItinerary,
      selectEditorialStarItinerary,
      selectTerritoryPoi,
      goBack,
      resetFrance,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInspirationMap(): InspirationMapContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useInspirationMap requires InspirationMapProvider");
  return v;
}
