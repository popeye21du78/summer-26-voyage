"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode, type UIEvent as ReactUIEvent } from "react";
import { Map, Star, Users } from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";
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

  /**
   * Rétractation naturelle de la TopBar (recherche + filtres + favoris)
   * sur scroll descendant, réapparition sur scroll montant. L'ancienne
   * version flippait constamment (seuil delta > 6px) → catastrophe UX.
   *
   * Approche v2 (hystérésis accumulée) :
   *   - tant que scrollTop < ALWAYS_SHOW : TopBar TOUJOURS visible
   *   - sinon, on accumule le delta dans la direction courante et on
   *     déclenche le hide UNIQUEMENT après HIDE_AFTER px en continu vers
   *     le bas, et le show UNIQUEMENT après SHOW_AFTER px en continu vers
   *     le haut. Tout changement de direction remet l'accumulateur à zéro.
   *   - résultat : pas de flip frénétique sur micro-scrolls, pas de
   *     disparition « à la moindre touche » — l'utilisateur doit
   *     manifester une intention claire.
   */
  const [topBarHidden, setTopBarHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const accumDownRef = useRef(0);
  const accumUpRef = useRef(0);
  const handleTabScroll = useCallback((e: ReactUIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (!target) return;
    const y = target.scrollTop;
    const delta = y - lastScrollYRef.current;
    lastScrollYRef.current = y;

    const ALWAYS_SHOW = 48;
    const HIDE_AFTER = 90;
    const SHOW_AFTER = 36;

    if (y < ALWAYS_SHOW) {
      accumDownRef.current = 0;
      accumUpRef.current = 0;
      setTopBarHidden(false);
      return;
    }

    if (delta > 0) {
      accumDownRef.current += delta;
      accumUpRef.current = 0;
      if (accumDownRef.current > HIDE_AFTER) setTopBarHidden(true);
    } else if (delta < 0) {
      accumUpRef.current += -delta;
      accumDownRef.current = 0;
      if (accumUpRef.current > SHOW_AFTER) setTopBarHidden(false);
    }
  }, []);
  useEffect(() => {
    setTopBarHidden(false);
    lastScrollYRef.current = 0;
    accumDownRef.current = 0;
    accumUpRef.current = 0;
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

  /**
   * NB (UX demandée par l'user) : le contenu des onglets doit défiler JUSQU'EN HAUT
   * de l'écran, en passant DERRIÈRE la barre de tabs (glass). Concrètement :
   *   - on NE met PAS de `paddingTop` sur l'outer → les tabs (absolute top:0)
   *     recouvrent le début du contenu au lieu de le pousser en dessous.
   *   - les TabPanels scroll-variant ont un `paddingTop` interne égal à
   *     `--viago-top-nav-h` + hauteur de la TopBar (quand elle est visible)
   *     pour qu'au chargement, la première ligne de contenu ne soit pas masquée.
   *   - une fois l'user scrolle, les éléments montent sous la nav → effet voulu.
   */
  const topBarOffsetPx = topBarHidden || searchHiddenForRegionSheet ? 0 : 64;

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="viago-top-tabs-wrap">
        <LayoutGroup id="inspirer-top-tabs">
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
                  {/**
                   * Capsule verre active PARTAGÉE : un seul motion.span au-dessus
                   * du DOM, qui glisse entre onglets via layoutId — identique au
                   * fonctionnement de la bottom nav.
                   */}
                  {isActive ? (
                    <motion.span
                      layoutId="inspirer-top-active-pill"
                      className="viago-top-tab-active-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.75 }}
                      aria-hidden
                    />
                  ) : null}
                  {isActive ? (
                    <motion.span
                      layoutId="inspirer-top-active-glow"
                      className="viago-top-tab-glow"
                      transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.75 }}
                      aria-hidden
                    />
                  ) : null}
                  <Icon className="relative z-[1] h-[18px] w-[18px]" strokeWidth={isActive ? 2.4 : 1.7} />
                  <span className="bottom-nav-label relative z-[1]">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      {/**
       * TopBar recherche/filtres :
       *  - Masquée en onglet « carte » → le user voulait un menu 3-points ailleurs,
       *    la barre de recherche bruitait la lecture cartographique.
       *  - Masquée progressivement au scroll down (stars/amis) via --hidden.
       *  - Masquée dès qu'une sheet région est ouverte.
       *  - Positionnée en `absolute` sous la top nav → ne pousse plus le contenu,
       *    qui peut maintenant défiler jusqu'en haut de l'écran derrière les deux.
       */}
      {active !== "carte" && (
        <div
          className={`inspirer-topbar-collapse pointer-events-none ${
            topBarHidden || searchHiddenForRegionSheet ? "inspirer-topbar-collapse--hidden" : ""
          }`}
          style={{
            position: "absolute",
            top: "var(--viago-top-nav-h)",
            insetInline: 0,
            zIndex: 110,
          }}
          aria-hidden={topBarHidden || searchHiddenForRegionSheet}
        >
          <div className="pointer-events-auto">
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
        </div>
      )}

      <InspirerRegionFromUrl active={active} initialRegion={initialRegion} />

      {/**
       * Conteneur du tab panel actif.
       * - Pas de `z-0` → pas de stacking context → la sheet région peut
       *   passer AU-DESSUS de la top nav (z-120) en plein écran.
       * - Pas de `minHeight: 100dvh` → le conteneur ne dépasse plus la zone
       *   disponible (flex-1 suffit) sinon la page carte devenait
       *   scrollable et la top nav disparaissait en haut.
       */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
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
          scrollPaddingTopPx={topBarOffsetPx}
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
          scrollPaddingTopPx={topBarOffsetPx}
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
  scrollPaddingTopPx,
}: {
  visible: boolean;
  mounted: boolean;
  variant: "map" | "scroll";
  scrollRef?: (el: HTMLDivElement | null) => void;
  onScroll?: (e: ReactUIEvent<HTMLDivElement>) => void;
  children: ReactNode;
  /**
   * Réserve de l'espace interne en haut pour la top nav + la topbar qui sont
   * désormais en overlay absolu au-dessus de ce panel. Les variantes `map` ne
   * l'utilisent pas — la carte doit bleeder jusqu'en haut.
   */
  scrollPaddingTopPx?: number;
}) {
  if (!mounted) return null;
  const overflow =
    variant === "map" ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden";
  /**
   * Regression majeure corrigée : pour la variante `map`, ne PAS envelopper
   * dans un inner div — la carte a besoin que son parent lui donne une hauteur
   * explicite (`absolute inset-0`). Un wrapper sans height réduisait la carte
   * à 0px de haut (= "plus rien n'apparait dans carte" signalé par l'user).
   */
  if (variant === "map") {
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

  const base = "var(--viago-top-nav-h)";
  const extra = scrollPaddingTopPx ?? 0;
  /**
   * L'inner wrapper est en flex-col avec `minHeight: 100%` (PAS `100dvh` :
   * on ne veut pas faire scroller la page en-dehors de la fenêtre visible,
   * sinon la top nav disparait). Le `flex-col` permet aux enfants qui
   * utilisent `flex-1` (InspirerStars / InspirerAmis) d'avoir une hauteur
   * concrète, ce qui résout le bug « rien n'apparaît dans s'inspirer »
   * (sans flex-col + minHeight, `h-full` sur les enfants tombait à 0px
   * parce que le parent n'avait pas de hauteur définie).
   */
  const innerStyle: React.CSSProperties = {
    minHeight: "100%",
    paddingTop: extra > 0 ? `calc(${base} + ${extra}px)` : base,
    transition: "padding-top 420ms cubic-bezier(0.32, 0.72, 0.25, 1)",
  };
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
      <div className="flex min-h-full flex-col" style={innerStyle}>
        {children}
      </div>
    </div>
  );
}
