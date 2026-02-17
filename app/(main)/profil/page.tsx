"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserCog, ArrowLeft } from "lucide-react";
import { getQuizStorageKey } from "../../../data/test-profiles";

/**
 * Page "Modifier ma perso" : quiz de personnalité (à venir).
 * Phase test : placeholder + enregistrement des réponses dans localStorage par profil.
 */
export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ profileId: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setProfile(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.push("/login");
      });
  }, [router]);

  function handleSave() {
    if (!profile) return;
    setSaving(true);
    const key = getQuizStorageKey(profile.profileId);
    const payload = {
      profileId: profile.profileId,
      updatedAt: new Date().toISOString(),
      answers: {}, // à remplir quand le quiz existera
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(payload));
    }
    setSaving(false);
    router.push("/accueil");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-[#333333]/70">Chargement…</p>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Link
        href="/accueil"
        className="mb-8 inline-flex items-center gap-2 text-sm text-[#A55734] transition hover:text-[#8b4728]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à l&apos;accueil
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <UserCog className="h-8 w-8 text-[#A55734]" aria-hidden />
        <h1 className="text-2xl font-light text-[#333333]">Modifier ma perso</h1>
      </div>
      <p className="mb-4 text-[#333333]/80">
        Connecté en tant que <strong>{profile.name}</strong>. Les réponses que tu
        enregistres ici sont associées à ce profil (phase de test).
      </p>
      <div className="rounded-lg border border-[#A55734]/30 bg-[#FFF2EB]/50 p-6 text-[#333333]/80">
        <p className="mb-4">
          Le quiz de personnalité du voyageur arrivera ici. En fonction de tes
          réponses, on construira une &quot;personnalité&quot; (ex. 16 types sur 4 axes).
        </p>
        <p className="mb-6 text-sm">
          Pour l&apos;instant, tu peux cliquer sur &quot;Enregistrer mes réponses&quot; pour
          valider la structure : les données seront stockées pour ce profil et tu
          seras redirigé vers l&apos;accueil.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-[#A55734] px-4 py-3 font-medium text-white transition hover:bg-[#8b4728] disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer mes réponses"}
        </button>
      </div>
    </main>
  );
}
