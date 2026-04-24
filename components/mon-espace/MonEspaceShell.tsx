"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent as ReactUIEvent,
} from "react";
import LinkWithReturn from "@/components/LinkWithReturn";
import { useRouter } from "next/navigation";
import { motion, LayoutGroup } from "framer-motion";
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
  initialSection?: string;
};

export default function MonEspaceShell({
  profileId,
  profileName,
  situationLabel,
  initialSection,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<VoyageStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const normalizeSection = (s?: string): SectionId =>
    s === "voyages" ||
    s === "carte" ||
    s === "favoris" ||
    s === "stats" ||
    s === "createur"
      ? s
      : "voyages";

  const [activeSection, setActiveSection] = useState<SectionId>(
    normalizeSection(initialSection)
  );
  const [mountedSections, setMountedSections] = useState<Set<SectionId>>(
    () => new Set<SectionId>([normalizeSection(initialSection)])
  );

  const panelRefs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({});
  const activeRef = useRef(activeSection);
  useEffect(() => {
    activeRef.current = activeSection;
  }, [activeSection]);

  /**
   * Rétraction douce du bloc profil au scroll descendant.
   * Même logique que la TopBar inspirer : on masque visuellement sans
   * décaler les sections d'un coup (transition sur max-height + opacity).
   */
  const [profileHeaderHidden, setProfileHeaderHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const handlePanelScroll = useCallback((e: ReactUIEvent<HTMLDivElement>) => {
    const y = e.currentTarget?.scrollTop ?? 0;
    const delta = y - lastScrollYRef.current;
    if (Math.abs(delta) > 6) {
      if (delta > 0 && y > 48) setProfileHeaderHidden(true);
      else if (delta < 0) setProfileHeaderHidden(false);
      lastScrollYRef.current = y;
    }
  }, []);
  useEffect(() => {
    setProfileHeaderHidden(false);
    lastScrollYRef.current = 0;
  }, [activeSection]);

  useEffect(() => {
    fetch("/api/voyage-state")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function persistScrollFor(section: SectionId) {
    const el = panelRefs.current[section];
    if (el) writeScrollY(MON_ESPACE_SECTION_KEY(section), el.scrollTop);
  }

  function goToSection(id: SectionId) {
    if (id === activeRef.current) return;
    persistScrollFor(activeRef.current);
    setMountedSections((prev) => new Set([...prev, id]));
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
    const refs = panelRefs.current;
    return () => {
      const s = activeRef.current;
      const el = refs[s];
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
      <main className="flex h-full items-center justify-center bg-[var(--color-bg-main)]">
        <p className="voyage-loading-text text-sm uppercase tracking-widest">
          voyage voyage…
        </p>
      </main>
    );
  }

  return (
    <main
      className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-bg-main)]"
    >
      <div className="viago-top-tabs-wrap">
        <LayoutGroup id="mon-espace-top-tabs">
          <div className="viago-top-tabs-pill" role="tablist">
            {SECTIONS.map(({ id, label, icon: Icon }) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => goToSection(id)}
                  className="viago-top-tab"
                >
                  {isActive ? (
                    <motion.span
                      layoutId="mon-espace-active-pill"
                      className="viago-top-tab-active-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.75 }}
                      aria-hidden
                    />
                  ) : null}
                  {isActive ? (
                    <motion.span
                      layoutId="mon-espace-active-glow"
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
       * Le bloc profil (avatar + nom + déconnexion) est désormais positionné
       * en OVERLAY absolu sous la top nav. Sans cette refonte, le bloc poussait
       * le contenu des onglets en dessous et la top nav apparaissait « collée »
       * au profil ; l'user voyait la top nav « bouger » au scroll parce que la
       * hauteur du header variait. En overlay, la top nav et le profil
       * restent visuellement à leur place et le contenu défile dessous.
       */}
      <LinkWithReturn
        href={profileId ? `/profil/${profileId}` : "/mon-espace"}
        className={`viago-row-hover inspirer-topbar-collapse flex items-center gap-4 border-b border-[var(--color-glass-border)] bg-[color-mix(in_srgb,var(--color-bg-main)_88%,transparent)] px-4 py-4 backdrop-blur-md ${
          profileHeaderHidden ? "inspirer-topbar-collapse--hidden" : ""
        }`}
        style={{
          position: "absolute",
          top: "var(--viago-top-nav-h)",
          insetInline: 0,
          zIndex: 105,
        }}
      >
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-[0_8px_20px_var(--color-shadow),0_2px_6px_var(--color-shadow-cta-accent)]"
          style={{ background: "var(--gradient-cta)" }}
        >
          <User className="h-7 w-7 text-white" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          {/*
           * Nom utilisateur = titre du header de Mon espace → police titre,
           * taille franche (user : « mon nom au dessus de voir mon profil
           * public » doit être en police titre).
           */}
          <p className="font-title text-xl font-bold leading-tight text-[var(--color-text-primary)]">
            {profileName}
          </p>
          <p className="mt-0.5 font-courier text-sm text-[var(--color-text-secondary)]">
            {situationLabel}
          </p>
          <p className="mt-1 font-courier text-[10px] text-[var(--color-accent-start)] opacity-70">
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-glass-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-glass-highlight)] hover:text-[color-mix(in_srgb,var(--color-text-primary)_55%,transparent)]"
          aria-label="Déconnexion"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </LinkWithReturn>

      {/**
       * Conteneur plein-écran des TabPanels.
       * `minHeight: 100dvh` pour que le contenu puisse défiler sous les overlays
       * (top nav + profile header) et descendre jusqu'en bas derrière la bottom nav.
       */}
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ minHeight: "100dvh" }}
      >
        {/**
         * `profileHeaderHidden` → on réduit la réserve haute pour que le contenu
         * remonte en même temps que le header collapse. Animation CSS pour rester
         * continue avec la collapse du header (même easing, même durée).
         */}
        <TabPanel
          visible={activeSection === "voyages"}
          mounted={mountedSections.has("voyages")}
          scrollRef={(el) => {
            panelRefs.current.voyages = el;
          }}
          onScroll={handlePanelScroll}
          topReservePx={profileHeaderHidden ? 0 : 104}
        >
          <EspaceVoyages state={state} />
        </TabPanel>
        <TabPanel
          visible={activeSection === "carte"}
          mounted={mountedSections.has("carte")}
          scrollRef={(el) => {
            panelRefs.current.carte = el;
          }}
          onScroll={handlePanelScroll}
          topReservePx={profileHeaderHidden ? 0 : 104}
        >
          <EspaceCartePerso state={state} />
        </TabPanel>
        <TabPanel
          visible={activeSection === "favoris"}
          mounted={mountedSections.has("favoris")}
          scrollRef={(el) => {
            panelRefs.current.favoris = el;
          }}
          onScroll={handlePanelScroll}
          topReservePx={profileHeaderHidden ? 0 : 104}
        >
          <EspaceFavoris />
        </TabPanel>
        <TabPanel
          visible={activeSection === "stats"}
          mounted={mountedSections.has("stats")}
          scrollRef={(el) => {
            panelRefs.current.stats = el;
          }}
          onScroll={handlePanelScroll}
          topReservePx={profileHeaderHidden ? 0 : 104}
        >
          <EspaceStats state={state} profileName={profileName} />
        </TabPanel>
        <TabPanel
          visible={activeSection === "createur"}
          mounted={mountedSections.has("createur")}
          scrollRef={(el) => {
            panelRefs.current.createur = el;
          }}
          onScroll={handlePanelScroll}
          topReservePx={profileHeaderHidden ? 0 : 104}
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
  onScroll,
  children,
  topReservePx,
}: {
  visible: boolean;
  mounted: boolean;
  scrollRef?: (el: HTMLDivElement | null) => void;
  onScroll?: (e: ReactUIEvent<HTMLDivElement>) => void;
  children: ReactNode;
  /**
   * Espace haut à réserver dans le scroll panel pour laisser apparaître la top
   * nav + le profile header (overlays absolus au-dessus). Varie selon que le
   * header est collapsé ou non. S'ajoute à `--viago-top-nav-h`.
   */
  topReservePx?: number;
}) {
  if (!mounted) return null;
  const extra = topReservePx ?? 0;
  const paddingTop =
    extra > 0
      ? `calc(var(--viago-top-nav-h) + ${extra}px)`
      : "var(--viago-top-nav-h)";
  return (
    <div
      ref={scrollRef}
      role="tabpanel"
      onScroll={onScroll}
      className="absolute inset-0 overflow-y-auto overflow-x-hidden scroll-smooth pb-bottom-nav"
      style={{ display: visible ? "block" : "none" }}
    >
      <div
        style={{
          paddingTop,
          transition: "padding-top 420ms cubic-bezier(0.32, 0.72, 0.25, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
