"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { TEST_PROFILES } from "../../data/test-profiles";
import { invalidateProfileIdCache } from "@/lib/me-client";

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSelectProfile(profileId: string) {
    setError("");
    setLoading(profileId);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error || "Erreur de connexion");
        return;
      }
      invalidateProfileIdCache();
      router.push("/accueil?welcome=1");
      router.refresh();
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF]">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="flex justify-center">
          <User className="h-12 w-12 text-[#E07856]" aria-hidden />
        </div>
        <h1 className="text-center font-heading text-4xl font-normal text-white/80">
          Viago
        </h1>
        <p className="text-center font-courier text-sm text-white/80/80">
          Choisis un profil pour voir Viago selon ta situation.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {TEST_PROFILES.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => handleSelectProfile(profile.id)}
              disabled={loading !== null}
              className="flex flex-col items-stretch gap-2 rounded-2xl border-2 border-[#E07856]/40 bg-[#111111] px-5 py-5 text-left transition hover:border-[#E07856] hover:bg-[#E07856]/10 disabled:opacity-50"
            >
              <span className="font-courier text-xl font-bold text-white/80">
                {profile.name}
              </span>
              <span className="font-courier text-sm leading-snug text-white/80/75">
                {profile.situationLabel}
              </span>
              <span className="font-courier text-[10px] uppercase tracking-wider text-[#E07856]/50">
                {profile.etatVoyage === "rien"
                  ? "Aucun voyage — découverte complète"
                  : profile.etatVoyage === "voyage_termine"
                    ? "Accueil nostalgie + relance"
                    : profile.etatVoyage === "voyage_prevu"
                      ? "Compte à rebours + préparation"
                    : profile.etatVoyage === "voyage_en_cours"
                      ? "Mode voyage actif"
                    : ""}
              </span>
              {loading === profile.id ? (
                <span className="font-courier text-sm text-white/80/70">Connexion…</span>
              ) : null}
            </button>
          ))}
        </div>
        {error && (
          <p className="text-center text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
