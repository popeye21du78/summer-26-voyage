"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { readMaintenanceTab, persistMaintenanceTab } from "@/lib/maintenance-ui-persist";
import { Map, BarChart3, Cpu, Settings, Route, Images, BookOpen, Sparkles } from "lucide-react";
import MaintenancePhotosTab from "@/components/maintenance/MaintenancePhotosTab";
import MaintenanceBeauty200Tab from "@/components/maintenance/MaintenanceBeauty200Tab";
import MaintenanceWikiTab from "@/components/maintenance/MaintenanceWikiTab";

const MAINTENANCE_LINKS = [
  { href: "/carte-villes", label: "Carte lieux", icon: Map },
  { href: "/recap-lieux", label: "Récap lieux", icon: BarChart3 },
  { href: "/batch-status", label: "Batch descriptions", icon: Cpu },
  { href: "/admin-lieux", label: "Admin", icon: Settings },
  { href: "/itineraire", label: "Itinéraire", icon: Route },
] as const;

type TabId = "links" | "photos" | "beauty" | "wiki";

export default function MaintenanceClient() {
  const [tab, setTabInner] = useState<TabId>("photos");

  useLayoutEffect(() => {
    const r = readMaintenanceTab();
    if (r) setTabInner(r);
  }, []);

  const setTab = useCallback((id: TabId) => {
    setTabInner(id);
    persistMaintenanceTab(id);
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-light text-[#333333]">Maintenance</h1>
      <p className="mb-6 text-[#333333]/80">
        Outils provisoires pendant la construction du site. L’onglet actif et ta position dans les files de tri
        sont mémorisés sur cet appareil ; les validations sont enregistrées dans les fichiers JSON du dépôt.
      </p>

      <div className="mb-8 flex flex-wrap gap-2 border-b border-[#A55734]/20 pb-2">
        <button
          type="button"
          onClick={() => setTab("photos")}
          className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition ${
            tab === "photos"
              ? "bg-[#A55734] text-white"
              : "bg-[#FFF2EB]/60 text-[#333] hover:bg-[#FFF2EB]"
          }`}
        >
          <Images className="h-4 w-4" aria-hidden />
          Tri photos Commons
        </button>
        <button
          type="button"
          onClick={() => setTab("beauty")}
          className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition ${
            tab === "beauty"
              ? "bg-[#A55734] text-white"
              : "bg-[#FFF2EB]/60 text-[#333] hover:bg-[#FFF2EB]"
          }`}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Top 200 · Unsplash → Wiki
        </button>
        <button
          type="button"
          onClick={() => setTab("wiki")}
          className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition ${
            tab === "wiki"
              ? "bg-[#A55734] text-white"
              : "bg-[#FFF2EB]/60 text-[#333] hover:bg-[#FFF2EB]"
          }`}
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          Test grandes villes
        </button>
        <button
          type="button"
          onClick={() => setTab("links")}
          className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition ${
            tab === "links"
              ? "bg-[#A55734] text-white"
              : "bg-[#FFF2EB]/60 text-[#333] hover:bg-[#FFF2EB]"
          }`}
        >
          Liens rapides
        </button>
      </div>

      {tab === "photos" && (
        <section className="rounded-xl border border-[#A55734]/15 bg-[#FFFCF9] p-4 md:p-6" aria-label="Tri photos">
          <MaintenancePhotosTab />
        </section>
      )}

      {tab === "beauty" && (
        <section className="rounded-xl border border-[#A55734]/15 bg-[#FFFCF9] p-4 md:p-6" aria-label="Top 200 beauté">
          <MaintenanceBeauty200Tab />
        </section>
      )}

      {tab === "wiki" && (
        <section className="rounded-xl border border-[#A55734]/15 bg-[#FFFCF9] p-4 md:p-6" aria-label="Test Wikipedia">
          <MaintenanceWikiTab />
        </section>
      )}

      {tab === "links" && (
        <>
          <div className="mb-4 text-sm text-[#333333]/60">
            Connecte-toi pour accéder aux outils ci-dessous.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {MAINTENANCE_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className="flex items-center gap-4 rounded-lg border border-[#A55734]/20 bg-white p-5 transition hover:border-[#A55734]/40 hover:bg-[#FFF2EB]/30"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#A55734]/10">
                  <Icon className="h-6 w-6 text-[#A55734]" aria-hidden />
                </div>
                <span className="font-medium text-[#333333]">{label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
