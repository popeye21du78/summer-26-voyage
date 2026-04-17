"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import LinkWithReturn from "@/components/LinkWithReturn";
import { useRouter } from "next/navigation";
import {
  Plane,
  Map,
  Heart,
  BarChart3,
  BookOpen,
  User,
  LogOut,
} from "lucide-react";
import type { VoyageStateResponse } from "@/types/voyage-state";
import EspaceVoyages from "./EspaceVoyages";
import EspaceCartePerso from "./EspaceCartePerso";
import EspaceFavoris from "./EspaceFavoris";
import EspaceStats from "./EspaceStats";
import EspaceMotCreateur from "./EspaceMotCreateur";
import {
  MON_ESPACE_SECTION_KEY,
  readScrollY,
  writeScrollY,
} from "@/lib/nav-scroll-memory";
import { invalidateProfileIdCache } from "@/lib/me-client";

const SECTIONS = [
  { id: "voyages", label: "Voyages", icon: Plane },
  { id: "carte", label: "Carte", icon: Map },
  { id: "favoris", label: "Repères", icon: Heart },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "createur", label: "Marque", icon: BookOpen },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

type Props = {
  profileId: string;
  profileName: string;
  situationLabel: string;
};

export default function MonEspaceShell({
  profileId,
  profileName,
  situationLabel,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<VoyageStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionId>("voyages");
  const [mountedSections, setMountedSections] = useState<Set<SectionId>>(
    () => new Set<SectionId>(["voyages"])
  );

  const panelRefs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({});
  const activeRef = useRef(activeSection);
  activeRef.current = activeSection;

  useEffect(() => {
    fetch("/api/voyage-state")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setMountedSections((prev) => new Set([...prev, activeSection]));
  }, [activeSection]);

  function persistScrollFor(section: SectionId) {
    const el = panelRefs.current[section];
    if (el) writeScrollY(MON_ESPACE_SECTION_KEY(section), el.scrollTop);
  }

  function goToSection(id: SectionId) {
    if (id === activeRef.current) return;
    persistScrollFor(activeRef.current);
    setActiveSection(id);
  }

  useEffect(() => {
    const el = panelRefs.current[activeSection];
    const y = readScrollY(MON_ESPACE_SECTION_KEY(activeSection));
    requestAnimationFrame(() => {
      if (el && y != null) el.scrollTop = y;
    });
  }, [activeSection]);

  useEffect(() => {
    return () => {
      const s = activeRef.current;
      const el = panelRefs.current[s];
      if (el) writeScrollY(MON_ESPACE_SECTION_KEY(s), el.scrollTop);
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    invalidateProfileIdCache();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center bg-[#111111]">
        <p className="voyage-loading-text text-sm uppercase tracking-widest">
          voyage voyage…
        </p>
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-[#111111]">
      <div className="shrink-0 border-b border-white/6 bg-[#111111]/95 backdrop-blur-lg">
        <div className="flex items-stretch" role="tablist">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => goToSection(id)}
                className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors duration-150 ${
                  isActive
                    ? "border-b-2 border-[#E07856] text-[#E07856]"
                    : "text-white/35 hover:text-white/55"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 1.6} />
                <span className="font-courier text-[10px] font-bold uppercase tracking-wider">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <LinkWithReturn
        href={profileId ? `/profil/${profileId}` : "/mon-espace"}
        className="flex shrink-0 items-center gap-4 border-b border-white/6 px-4 py-4 transition hover:bg-white/[0.03]"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E07856] to-[#c94a4a] shadow-[0_4px_16px_rgba(224,120,86,0.3)]">
          <User className="h-7 w-7 text-white" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-courier text-lg font-bold leading-tight text-white">
            {profileName}
          </p>
          <p className="mt-0.5 font-courier text-sm text-white/45">{situationLabel}</p>
          <p className="mt-1 font-courier text-[10px] text-[#E07856]/60">
            Voir mon profil public
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleLogout();
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/8 text-white/40 transition hover:border-white/15 hover:text-white/60"
          aria-label="Déconnexion"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </LinkWithReturn>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <TabPanel
          visible={activeSection === "voyages"}
          mounted={mountedSections.has("voyages")}
          scrollRef={(el) => {
            panelRefs.current.voyages = el;
          }}
        >
          <EspaceVoyages state={state} />
        </TabPanel>
        <TabPanel
          visible={activeSection === "carte"}
          mounted={mountedSections.has("carte")}
          scrollRef={(el) => {
            panelRefs.current.carte = el;
          }}
        >
          <EspaceCartePerso state={state} />
        </TabPanel>
        <TabPanel
          visible={activeSection === "favoris"}
          mounted={mountedSections.has("favoris")}
          scrollRef={(el) => {
            panelRefs.current.favoris = el;
          }}
        >
          <EspaceFavoris />
        </TabPanel>
        <TabPanel
          visible={activeSection === "stats"}
          mounted={mountedSections.has("stats")}
          scrollRef={(el) => {
            panelRefs.current.stats = el;
          }}
        >
          <EspaceStats state={state} profileName={profileName} />
        </TabPanel>
        <TabPanel
          visible={activeSection === "createur"}
          mounted={mountedSections.has("createur")}
          scrollRef={(el) => {
            panelRefs.current.createur = el;
          }}
        >
          <EspaceMotCreateur />
        </TabPanel>
      </div>
    </main>
  );
}

function TabPanel({
  visible,
  mounted,
  scrollRef,
  children,
}: {
  visible: boolean;
  mounted: boolean;
  scrollRef?: (el: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  if (!mounted) return null;
  return (
    <div
      ref={scrollRef}
      role="tabpanel"
      className="absolute inset-0 overflow-y-auto overflow-x-hidden scroll-smooth"
      style={{ display: visible ? "block" : "none" }}
    >
      {children}
    </div>
  );
}
