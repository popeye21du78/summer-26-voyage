"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode, type UIEvent as ReactUIEvent } from "react";
import { Map, Star, Users } from "lucide-react";
import InspirerCarteWrapper from "./InspirerCarteWrapper";
import InspirerStars from "./InspirerStars";
import InspirerAmis from "./InspirerAmis";
import TopBar from "@/components/planifier/inspiration/TopBar";
import { InspirationMapProvider, useInspirationMap } from "@/lib/inspiration-map-context";
import {
  INSPIRER_TAB_KEY,
  readScrollY,
  writeScrollY,
} from "@/lib/nav-scroll-memory";

const TABS = [
  { id: "carte", label: "Carte", icon: Map },
  { id: "stars", label: "Stars", icon: Star },
  { id: "amis", label: "Amis", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isValidTab(s: string | undefined): s is TabId {
  return TABS.some((t) => t.id === s);
}

/** Ancien onglet « recherche » retiré : on renvoie vers la carte. */
function normalizeInitialTab(s: string | undefined): TabId | undefined {
  if (!s || s === "recherche") return "carte";
  return isValidTab(s) ? s : undefined;
}

type Props = {
  mapboxAccessToken: string | undefined;
  initialTab?: string;
  initialRegion?: string;
};

function InspirerRegionFromUrl({
  active,
  initialRegion,
}: {
  active: TabId;
  initialRegion?: string;
}) {
  const { selectRegion } = useInspirationMap();
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (active !== "carte" || !initialRegion) return;
    if (appliedRef.current === initialRegion) return;
    selectRegion(initialRegion);
    appliedRef.current = initialRegion;
  }, [active, initialRegion, selectRegion]);

  return null;
}

/**
 * Mini-composant lu depuis le contexte carte : sait si une région est sélectionnée
 * (sheet ouverte) → on cache alors la top bar tabs + recherche pour libérer la carte
 * et permettre le drag de la sheet sur toute sa hauteur.
 */
function useIsRegionSheetOpen(): boolean {
  const { top } = useInspirationMap();
  return top.screen !== "france" && top.screen !== "region-map-fullscreen";
}

function InspirerTabsInner({
  mapboxAccessToken,
  initialTab,
  initialRegion,
}: Props) {
  const resolvedInitialTab: TabId = normalizeInitialTab(initialTab) ?? "carte";
  const [active, setActive] = useState<TabId>(resolvedInitialTab);
  const [mountedTabs, setMountedTabs] = useState<Record<TabId, boolean>>(() => ({
    carte: resolvedInitialTab === "carte",
    stars: resolvedInitialTab === "stars",
    amis: resolvedInitialTab === "amis",
  }));

  const scrollRefs = useRef<Partial<Record<TabId, HTMLDivElement | null>>>({});
  const activeRef = useRef<TabId>(active);
  activeRef.current = active;

  const [starsSearch, setStarsSearch] = useState("");
  const [amisSearch, setAmisSearch] = useState("");

  /** Rétracter la TopBar (recherche + filtres + favoris) quand on descend,
   *  la remontrer quand on remonte. Ignoré sur l'onglet carte (pas de scroll). */
  const [topBarHidden, setTopBarHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const handleTabScroll = useCallback((e: ReactUIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (!target) return;
    const y = target.scrollTop;
    const delta = y - lastScrollYRef.current;
    if (Math.abs(delta) > 6) {
      if (delta > 0 && y > 72) setTopBarHidden(true);
      else if (delta < 0) setTopBarHidden(false);
      lastScrollYRef.current = y;
    }
  }, []);
  useEffect(() => {
    /** Au changement d'onglet, on ré-affiche la TopBar pour ne pas piéger l'user. */
    setTopBarHidden(false);
    lastScrollYRef.current = 0;
  }, [active]);

  /**
   * Sheet région ouverte sur l'onglet carte :
   * - on garde TOUJOURS les top tabs visibles (demande produit : la sheet doit
   *   recouvrir la carte mais JAMAIS le menu du haut)
   * - on rétracte juste la barre de recherche (elle peut disparaître derrière la sheet)
   */
  const regionSheetOpen = useIsRegionSheetOpen();
  const searchHiddenForRegionSheet = active === "carte" && regionSheetOpen;

  useEffect(() => {
    const n = normalizeInitialTab(initialTab);
    if (n && n !== active) {
      setActive(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  useEffect(() => {
    setMountedTabs((prev) => (prev[active] ? prev : { ...prev, [active]: true }));
  }, [active]);

  function persistCurrentScroll() {
    const tab = activeRef.current;
    if (tab === "carte") return;
    const el = scrollRefs.current[tab];
    if (el) writeScrollY(INSPIRER_TAB_KEY(tab), el.scrollTop);
  }

  function selectTab(id: TabId) {
    if (id === active) return;
    persistCurrentScroll();
    setActive(id);
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      u.searchParams.set("tab", id);
      window.history.replaceState(null, "", `${u.pathname}${u.search}`);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const t = u.searchParams.get("tab");
    if (isValidTab(t ?? undefined) && t !== activeRef.current) {
      setActive(t as TabId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lecture initiale URL / navigation arrière
  }, []);

  useEffect(() => {
    if (active === "carte") return;
    const el = scrollRefs.current[active];
    const y = readScrollY(INSPIRER_TAB_KEY(active));
    requestAnimationFrame(() => {
      if (el && y != null) el.scrollTop = y;
    });
  }, [active]);

  useEffect(() => {
    return () => {
      const tab = activeRef.current;
      if (tab === "carte") return;
      const el = scrollRefs.current[tab];
      if (el) writeScrollY(INSPIRER_TAB_KEY(tab), el.scrollTop);
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div
        className="viago-top-tabs-wrap inspirer-topbar-collapse"
      >
        <div className="viago-top-tabs-pill" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => selectTab(id)}
                className="viago-top-tab"
              >
                <Icon className="h-4 w-4" strokeWidth={isActive ? 2.4 : 1.6} />
                <span className="font-courier text-[10px] font-bold uppercase tracking-wider">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`inspirer-topbar-collapse ${
          topBarHidden || searchHiddenForRegionSheet ? "inspirer-topbar-collapse--hidden" : ""
        }`}
        aria-hidden={topBarHidden || searchHiddenForRegionSheet}
      >
        <TopBar
          searchOverride={
            active === "stars"
              ? {
                  value: starsSearch,
                  onChange: setStarsSearch,
                  placeholder: "Rechercher un itinéraire, un thème…",
                }
              : active === "amis"
                ? {
                    value: amisSearch,
                    onChange: setAmisSearch,
                    placeholder: "Ami, voyage, ville…",
                  }
                : undefined
          }
        />
      </div>

      <InspirerRegionFromUrl active={active} initialRegion={initialRegion} />

      {/* Hauteur mini viewport : onglets + TopBar (Hub, recherche, filtres, favoris) */}
      <div
        className="relative z-0 min-h-0 flex-1 overflow-hidden"
        style={{ minHeight: "calc(100dvh - 11.5rem)" }}
      >
        <TabPanel
          visible={active === "carte"}
          mounted={mountedTabs.carte}
          variant="map"
        >
          <InspirerCarteWrapper mapboxAccessToken={mapboxAccessToken} />
        </TabPanel>
        <TabPanel
          visible={active === "stars"}
          mounted={mountedTabs.stars}
          variant="scroll"
          scrollRef={(el) => {
            scrollRefs.current.stars = el;
          }}
          onScroll={handleTabScroll}
        >
          <InspirerStars initialRegionFilter={initialRegion} searchQuery={starsSearch} />
        </TabPanel>
        <TabPanel
          visible={active === "amis"}
          mounted={mountedTabs.amis}
          variant="scroll"
          scrollRef={(el) => {
            scrollRefs.current.amis = el;
          }}
          onScroll={handleTabScroll}
        >
          <InspirerAmis searchQuery={amisSearch} />
        </TabPanel>
      </div>
    </div>
  );
}

export default function InspirerTabs(props: Props) {
  return (
    <InspirationMapProvider>
      <InspirerTabsInner {...props} />
    </InspirationMapProvider>
  );
}

function TabPanel({
  visible,
  mounted,
  variant,
  scrollRef,
  onScroll,
  children,
}: {
  visible: boolean;
  mounted: boolean;
  variant: "map" | "scroll";
  scrollRef?: (el: HTMLDivElement | null) => void;
  onScroll?: (e: ReactUIEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  if (!mounted) return null;
  const overflow = variant === "map" ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden";
  return (
    <div
      ref={scrollRef}
      role="tabpanel"
      onScroll={onScroll}
      className={`absolute inset-0 ${overflow} scroll-smooth`}
      style={{
        display: visible ? "block" : "none",
      }}
    >
      {children}
    </div>
  );
}
