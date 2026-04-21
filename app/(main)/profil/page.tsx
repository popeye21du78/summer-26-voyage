"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserCog, ArrowLeft } from "lucide-react";
import { getQuizStorageKey } from "../../../data/test-profiles";
import QuizIdentite from "../../../components/QuizIdentite";
import type { QuizIdentiteAnswers } from "../../../data/quiz-types";

/**
 * Page "Modifier ma perso" : quiz d'identité du voyageur.
 * Phase test : localStorage par profil.
 */
export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ profileId: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialAnswers, setInitialAnswers] = useState<Partial<QuizIdentiteAnswers>>({});

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
        if (data) {
          setProfile(data);
          const key = getQuizStorageKey(data.profileId);
          if (typeof window !== "undefined") {
            try {
              const stored = window.localStorage.getItem(key);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.answers) setInitialAnswers(parsed.answers);
              }
            } catch {
              // ignorer
            }
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.push("/login");
      });
  }, [router]);

  function handleSave(answers: QuizIdentiteAnswers) {
    if (!profile) return;
    setSaving(true);
    const key = getQuizStorageKey(profile.profileId);
    const payload = {
      profileId: profile.profileId,
      updatedAt: new Date().toISOString(),
      answers,
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
        className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--color-accent-end)] transition hover:text-[var(--color-accent-deep)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à l&apos;accueil
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <UserCog className="h-8 w-8 text-[var(--color-accent-end)]" aria-hidden />
        <h1 className="text-2xl font-light text-[#333333]">Modifier ma perso</h1>
      </div>
      <p className="mb-6 text-[#333333]/80">
        Connecté en tant que <strong>{profile.name}</strong>. Les réponses sont
        associées à ce profil (phase de test). On en fera une &quot;personnalité&quot;
        du voyageur pour adapter tes itinéraires.
      </p>
      <div className="rounded-lg border border-[var(--color-accent-end)]/30 bg-[#FFF2EB]/30 p-6">
        <QuizIdentite
          initialAnswers={initialAnswers}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </main>
  );
}
