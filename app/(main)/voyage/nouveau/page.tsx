"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import QuizPreVoyage from "../../../../components/QuizPreVoyage";
import type { QuizPreVoyageAnswers } from "../../../../data/quiz-types";

const QUIZ_PREVOYAGE_KEY = "quiz_prevoyage";

export default function NouveauVoyagePage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initialAnswers, setInitialAnswers] = useState<Partial<QuizPreVoyageAnswers>>({});

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
          setProfileId(data.profileId);
          if (typeof window !== "undefined") {
            try {
              const stored = window.localStorage.getItem(
                `${QUIZ_PREVOYAGE_KEY}_${data.profileId}`
              );
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.answers) setInitialAnswers(parsed.answers);
              }
            } catch {
              // ignorer
            }
          }
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  function handleSubmit(answers: QuizPreVoyageAnswers) {
    setSubmitting(true);
    const key = profileId
      ? `${QUIZ_PREVOYAGE_KEY}_${profileId}`
      : QUIZ_PREVOYAGE_KEY;
    const payload = {
      updatedAt: new Date().toISOString(),
      answers,
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(payload));
    }
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Link
        href="/accueil"
        className="mb-8 inline-flex items-center gap-2 text-sm text-[#A55734] transition hover:text-[#8b4728]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour
      </Link>
      <h1 className="mb-2 text-2xl font-light text-[#333333]">
        Créer un voyage
      </h1>

      {submitted ? (
        <div className="rounded-lg border border-[#A55734]/30 bg-[#FFF2EB]/50 p-6">
          <p className="mb-4 text-[#333333]">
            Tes préférences ont été enregistrées. La génération
            d&apos;itinéraires personnalisés arrivera prochainement.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/accueil"
              className="rounded-lg bg-[#A55734] px-4 py-3 font-medium text-white transition hover:bg-[#8b4728]"
            >
              Retour à l&apos;accueil
            </Link>
            <Link
              href="/mes-voyages"
              className="rounded-lg border border-[#A55734]/40 px-4 py-3 font-medium text-[#A55734] transition hover:bg-[#FFF2EB]/50"
            >
              Voir mes voyages
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-6 text-[#333333]/80">
            Réponds à quelques questions pour qu&apos;on te propose des
            itinéraires adaptés à ce voyage.
          </p>
          <div className="rounded-lg border border-[#A55734]/30 bg-[#FFF2EB]/30 p-6">
            <QuizPreVoyage
              initialAnswers={initialAnswers}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          </div>
        </>
      )}
    </main>
  );
}
