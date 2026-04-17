"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { Map, Star, Users } from "lucide-react";
import InspirerCarteWrapper from "./InspirerCarteWrapper";
import InspirerStars from "./InspirerStars";
import InspirerAmis from "./InspirerAmis";
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

export default function InspirerTabs({
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
  }

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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-white/6 bg-[#111111]/95 backdrop-blur-lg">
        <div className="flex items-stretch" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => selectTab(id)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors duration-150 ${
                  isActive
                    ? "border-b-2 border-[#E07856] text-[#E07856]"
                    : "text-white/35 hover:text-white/55"
                }`}
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
        >
          <InspirerStars initialRegionFilter={initialRegion} />
        </TabPanel>
        <TabPanel
          visible={active === "amis"}
          mounted={mountedTabs.amis}
          variant="scroll"
          scrollRef={(el) => {
            scrollRefs.current.amis = el;
          }}
        >
          <InspirerAmis />
        </TabPanel>
      </div>
    </div>
  );
}

function TabPanel({
  visible,
  mounted,
  variant,
  scrollRef,
  children,
}: {
  visible: boolean;
  mounted: boolean;
  variant: "map" | "scroll";
  scrollRef?: (el: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  if (!mounted) return null;
  const overflow = variant === "map" ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden";
  return (
    <div
      ref={scrollRef}
      role="tabpanel"
      className={`absolute inset-0 ${overflow} scroll-smooth`}
      style={{
        display: visible ? "block" : "none",
      }}
    >
      {children}
    </div>
  );
}
