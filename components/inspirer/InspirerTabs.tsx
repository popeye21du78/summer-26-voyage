"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Search, Map, Star, Users } from "lucide-react";
import InspirerSearch from "./InspirerSearch";
import InspirerCarteWrapper from "./InspirerCarteWrapper";
import InspirerStars from "./InspirerStars";
import InspirerAmis from "./InspirerAmis";

const TABS = [
  { id: "recherche", label: "Recherche", icon: Search },
  { id: "carte", label: "Carte", icon: Map },
  { id: "stars", label: "Stars", icon: Star },
  { id: "amis", label: "Amis", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isValidTab(s: string | undefined): s is TabId {
  return TABS.some((t) => t.id === s);
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
  const resolvedInitialTab: TabId = isValidTab(initialTab)
    ? initialTab
    : "carte";
  const [active, setActive] = useState<TabId>(resolvedInitialTab);
  const mountedRef = useRef<Set<TabId>>(new Set([resolvedInitialTab]));

  useEffect(() => {
    if (isValidTab(initialTab) && initialTab !== active) {
      setActive(initialTab);
      if (!mountedRef.current.has(initialTab)) {
        mountedRef.current.add(initialTab);
      }
    }
    // Only react to prop changes, not internal state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  if (!mountedRef.current.has(active)) {
    mountedRef.current.add(active);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Tab bar */}
      <div className="shrink-0 border-b border-white/6 bg-[#111111]/95 backdrop-blur-lg">
        <div className="flex items-stretch" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(id)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${
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

      {/* Tab panels */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <TabPanel visible={active === "recherche"} mounted={mountedRef.current.has("recherche")}>
          <InspirerSearch />
        </TabPanel>
        <TabPanel visible={active === "carte"} mounted={mountedRef.current.has("carte")}>
          <InspirerCarteWrapper mapboxAccessToken={mapboxAccessToken} />
        </TabPanel>
        <TabPanel visible={active === "stars"} mounted={mountedRef.current.has("stars")}>
          <InspirerStars initialRegionFilter={initialRegion} />
        </TabPanel>
        <TabPanel visible={active === "amis"} mounted={mountedRef.current.has("amis")}>
          <InspirerAmis />
        </TabPanel>
      </div>
    </div>
  );
}

function TabPanel({
  visible,
  mounted,
  children,
}: {
  visible: boolean;
  mounted: boolean;
  children: ReactNode;
}) {
  if (!mounted) return null;
  return (
    <div
      role="tabpanel"
      className="absolute inset-0 overflow-hidden"
      style={{
        display: visible ? "block" : "none",
      }}
    >
      {children}
    </div>
  );
}
