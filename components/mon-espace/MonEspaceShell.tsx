"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
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
  profileId: _profileId,
  profileName,
  situationLabel,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<VoyageStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionId>("voyages");
  const mountedRef = useRef<Set<SectionId>>(new Set(["voyages"]));

  if (!mountedRef.current.has(activeSection)) {
    mountedRef.current.add(activeSection);
  }

  useEffect(() => {
    fetch("/api/voyage-state")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
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
                onClick={() => setActiveSection(id)}
                className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
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

      {/* Bandeau identité — court, lisible */}
      <div className="flex shrink-0 items-center gap-4 border-b border-white/6 px-4 py-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E07856] to-[#c94a4a] shadow-[0_4px_16px_rgba(224,120,86,0.3)]">
          <User className="h-7 w-7 text-white" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-courier text-lg font-bold leading-tight text-white">
            {profileName}
          </p>
          <p className="mt-0.5 font-courier text-sm text-white/45">{situationLabel}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/8 text-white/40 transition hover:border-white/15 hover:text-white/60"
          aria-label="Déconnexion"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Panneaux (montés une fois visités, comme S&apos;inspirer) */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <TabPanel
          visible={activeSection === "voyages"}
          mounted={mountedRef.current.has("voyages")}
        >
          <EspaceVoyages state={state} />
        </TabPanel>
        <TabPanel
          visible={activeSection === "carte"}
          mounted={mountedRef.current.has("carte")}
        >
          <EspaceCartePerso state={state} />
        </TabPanel>
        <TabPanel
          visible={activeSection === "favoris"}
          mounted={mountedRef.current.has("favoris")}
        >
          <EspaceFavoris />
        </TabPanel>
        <TabPanel
          visible={activeSection === "stats"}
          mounted={mountedRef.current.has("stats")}
        >
          <EspaceStats state={state} profileName={profileName} />
        </TabPanel>
        <TabPanel
          visible={activeSection === "createur"}
          mounted={mountedRef.current.has("createur")}
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
      className="absolute inset-0 overflow-y-auto overflow-x-hidden"
      style={{ display: visible ? "block" : "none" }}
    >
      {children}
    </div>
  );
}
