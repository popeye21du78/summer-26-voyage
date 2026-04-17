"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Edit3, Eye, LogOut } from "lucide-react";
import type { VoyageStateResponse } from "@/types/voyage-state";
import { invalidateProfileIdCache } from "@/lib/me-client";

type Props = {
  profileId: string;
  profileName: string;
  situationLabel: string;
  state: VoyageStateResponse | null;
};

export default function EspaceHeader({
  profileId,
  profileName,
  situationLabel,
  state,
}: Props) {
  const router = useRouter();
  const [showPublic, setShowPublic] = useState(false);

  const voyageCount =
    (state?.voyagesPrevus?.length ?? (state?.voyagePrevu ? 1 : 0)) +
    (state?.voyageEnCours ? 1 : 0) +
    (state?.voyagesTermines?.length ?? 0);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    invalidateProfileIdCache();
    router.push("/");
    router.refresh();
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#2a1810] to-[#3d2618] px-5 pb-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]">
      <div className="absolute inset-0 opacity-[0.04]">
        <div className="h-full w-full bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20256%20256%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.9%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23n)%27/%3E%3C/svg%3E')]" />
      </div>

      <div className="relative z-10">
        {/* Top row */}
        <div className="mb-6 flex items-center justify-between">
          <p className="font-courier text-[10px] font-bold uppercase tracking-[0.45em] text-[#E07856]">
            Mon espace
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 font-courier text-[10px] text-white/40 transition hover:text-white/60"
          >
            <LogOut className="h-3 w-3" />
            Déconnexion
          </button>
        </div>

        {/* Avatar + identity */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E07856] to-[#c94a4a] shadow-lg">
            <User className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-courier text-xl font-bold text-white">
              {profileName}
            </h1>
            <p className="font-courier text-xs text-white/50">
              {situationLabel}
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div>
            <dd className="font-courier text-xl font-bold text-[#E07856]">
              {voyageCount}
            </dd>
            <dt className="font-courier text-[9px] font-bold uppercase tracking-wider text-white/40">
              Voyages
            </dt>
          </div>
          <div>
            <dd className="font-courier text-xl font-bold text-[#E07856]">
              {state?.voyagesTermines?.reduce((a, v) => a + (v.stats?.km ?? 0), 0) || "—"}
            </dd>
            <dt className="font-courier text-[9px] font-bold uppercase tracking-wider text-white/40">
              km
            </dt>
          </div>
          <div>
            <dd className="font-courier text-xl font-bold text-[#E07856]">
              {state?.voyagesTermines?.reduce((a, v) => a + (v.stats?.budget ?? 0), 0) || "—"}
            </dd>
            <dt className="font-courier text-[9px] font-bold uppercase tracking-wider text-white/40">
              € dépensés
            </dt>
          </div>
        </dl>

        {/* Action buttons */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-2.5 font-courier text-[11px] font-bold text-white/70 backdrop-blur-sm transition hover:bg-white/10"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Modifier
          </button>
          <button
            type="button"
            onClick={() => setShowPublic(!showPublic)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-2.5 font-courier text-[11px] font-bold text-white/70 backdrop-blur-sm transition hover:bg-white/10"
          >
            <Eye className="h-3.5 w-3.5" />
            Vue publique
          </button>
        </div>

        {showPublic && (
          <div className="mt-4 rounded-xl border border-[#E07856]/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="font-courier text-xs font-bold text-[#E07856]">
              Aperçu public
            </p>
            <p className="mt-2 font-courier text-xs text-white/60">
              {profileName} · {voyageCount} voyages ·{" "}
              {state?.voyagesTermines?.length ?? 0} terminés
            </p>
            <p className="mt-1 font-courier text-[10px] text-white/35">
              Les stats et coups de cœur visibles ici seront accessibles par tes amis.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
