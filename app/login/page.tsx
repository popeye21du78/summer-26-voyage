"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { TEST_PROFILES } from "../../data/test-profiles";

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
          <User className="h-12 w-12 text-[#A55734]" aria-hidden />
        </div>
        <h1 className="text-center font-heading text-4xl font-normal text-[#333333]">
          Van-Life Journal
        </h1>
        <p className="text-center text-[#333333]/80">
          Choisis un profil pour te connecter (phase de test).
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {TEST_PROFILES.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => handleSelectProfile(profile.id)}
              disabled={loading !== null}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-[#A55734]/40 bg-[#FAF4F0] px-4 py-6 transition hover:border-[#A55734] hover:bg-[#A55734]/10 disabled:opacity-50"
            >
              <span className="text-2xl font-medium text-[#333333]">
                {profile.name}
              </span>
              {loading === profile.id ? (
                <span className="text-sm text-[#333333]/70">Connexion…</span>
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
