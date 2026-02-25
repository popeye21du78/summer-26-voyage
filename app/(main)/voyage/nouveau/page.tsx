"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import QuizPreVoyage from "../../../../components/QuizPreVoyage";
import type { QuizPreVoyageAnswers } from "../../../../data/quiz-types";
import type { QuizIdentiteAnswers } from "../../../../data/quiz-types";
import { getQuizStorageKey } from "../../../../data/test-profiles";
import { quizToProfilRecherche } from "../../../../lib/quiz-to-profil";
import type { ProfilRecherche } from "../../../../lib/quiz-to-profil";
import { applyProportions, type LieuScore } from "../../../../lib/score-lieux";
import type { LieuPoint, LieuType } from "../../../../lib/lieux-types";

const QUIZ_PREVOYAGE_KEY = "quiz_prevoyage";

const CitiesMapView = dynamic(() => import("../../../../components/CitiesMapView"), {
  ssr: false,
});

const TOP_PERCENTS = [1, 3, 5, 10, 20] as const;

function lieuScoreToPoint(ls: LieuScore): LieuPoint {
  const type: LieuType =
    ls.source_type === "plage" ? "plage" : ls.source_type === "rando" ? "rando" : "patrimoine";
  return {
    id: `${type}-${ls.code_dep}-${ls.slug}`,
    nom: ls.nom,
    slug: ls.slug,
    departement: ls.departement,
    code_dep: ls.code_dep,
    type,
    lat: ls.lat!,
    lng: ls.lng!,
    plus_beaux_villages: ls.plus_beaux_villages === "oui" ? "oui" : undefined,
  };
}

export default function NouveauVoyagePage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initialAnswers, setInitialAnswers] = useState<Partial<QuizPreVoyageAnswers>>({});
  const [profil, setProfil] = useState<ProfilRecherche | null>(null);
  const [lieuxScored, setLieuxScored] = useState<LieuScore[]>([]);
  const [loadingLieux, setLoadingLieux] = useState(false);
  const [topPercent, setTopPercent] = useState<number>(5);

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
          setProfileName(data.name ?? "");
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

  const displayedLieux = useMemo(() => {
    if (lieuxScored.length === 0) return [];
    const count = Math.max(1, Math.ceil((topPercent / 100) * lieuxScored.length));

    // Proportions par famille_type (plages, randos, chateaux, villages, villes, musees)
    const prop = profil?.proportionsAmbiance;
    if (prop) {
      return applyProportions(lieuxScored, prop, count, profil ?? undefined);
    }

    return lieuxScored.slice(0, count);
  }, [lieuxScored, topPercent, profil?.proportionsAmbiance]);

  const lieuxForMap = useMemo(() => displayedLieux.map(lieuScoreToPoint), [displayedLieux]);

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

      let identiteAnswers: Partial<QuizIdentiteAnswers> = {};
      if (profileId) {
        try {
          const identiteStored = window.localStorage.getItem(
            getQuizStorageKey(profileId)
          );
          if (identiteStored) {
            const parsed = JSON.parse(identiteStored);
            if (parsed?.answers) identiteAnswers = parsed.answers;
          }
        } catch {
          // ignorer
        }
      }
      const p = quizToProfilRecherche(identiteAnswers, answers);
      setProfil(p);

      setLoadingLieux(true);
      fetch("/api/score-lieux", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profil: p }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.lieux) setLieuxScored(data.lieux);
        })
        .catch(() => setLieuxScored([]))
        .finally(() => setLoadingLieux(false));
    }
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
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
        <div className="space-y-6">
          {/* Compte rendu */}
          {profil && (
            <div className="rounded-lg border border-[#A55734]/30 bg-[#FFF2EB]/30 p-6">
              <h2 className="mb-4 text-lg font-medium text-[#333333]">
                Profil de recherche — {profileName}
              </h2>
              <p className="mb-4 text-sm text-[#333333]/80">
                Voici ce qu&apos;on va aller chercher pour toi :
              </p>
              <pre
                className="whitespace-pre-wrap rounded-lg bg-white/60 p-4 font-sans text-sm leading-relaxed text-[#333333]"
                style={{ fontFamily: "inherit" }}
              >
                {profil.compteRendu}
              </pre>
            </div>
          )}

          {/* Boutons Top % + Carte */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-[#333333]">Afficher :</span>
              {TOP_PERCENTS.map((pct) => {
                const count = lieuxScored.length > 0
                  ? Math.max(1, Math.ceil((pct / 100) * lieuxScored.length))
                  : 0;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTopPercent(pct)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      topPercent === pct
                        ? "bg-[#A55734] text-white"
                        : "border border-[#A55734]/40 bg-white text-[#333333] hover:bg-[#FFF2EB]/50"
                    }`}
                  >
                    Top {pct}% ({count} lieux)
                  </button>
                );
              })}
            </div>

            {loadingLieux ? (
              <div className="flex items-center gap-3 rounded-lg border border-[#A55734]/30 bg-[#FFF2EB]/30 p-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#A55734] border-t-transparent" />
                <p className="text-[#333333]">Chargement des lieux pertinents…</p>
              </div>
            ) : lieuxForMap.length > 0 && process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
              <div className="h-[450px] w-full">
                <CitiesMapView
                  lieux={lieuxForMap}
                  mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN!}
                />
              </div>
            ) : lieuxForMap.length > 0 && !process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-[#333333]">
                  {displayedLieux.length} lieu{displayedLieux.length > 1 ? "x" : ""} sélectionné
                  {displayedLieux.length > 1 ? "s" : ""}. Configure <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> pour afficher la carte.
                </p>
              </div>
            ) : lieuxScored.length === 0 && !loadingLieux ? (
              <div className="rounded-lg border border-[#A55734]/30 bg-[#FFF2EB]/30 p-4">
                <p className="text-sm text-[#333333]/80">
                  Aucun lieu trouvé. Vérifie que <code>data/cities/lieux-central.json</code> existe.
                </p>
              </div>
            ) : null}
          </div>

          {/* Tableau */}
          {displayedLieux.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-[#A55734]/30">
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-[#FFF2EB]/80">
                    <tr>
                      <th className="border-b border-[#A55734]/30 px-3 py-2 font-medium text-[#333333]">Nom</th>
                      <th className="border-b border-[#A55734]/30 px-3 py-2 font-medium text-[#333333]">Type</th>
                      <th className="border-b border-[#A55734]/30 px-3 py-2 font-medium text-[#333333]">Département</th>
                      <th className="border-b border-[#A55734]/30 px-3 py-2 font-medium text-[#333333]">Score</th>
                      <th className="border-b border-[#A55734]/30 px-3 py-2 font-medium text-[#333333]">Facteurs</th>
                      <th className="border-b border-[#A55734]/30 px-3 py-2 font-medium text-[#333333]">Sélection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLieux.map((ls, i) => (
                      <tr key={`${ls.slug}-${ls.code_dep}-${i}`} className="border-b border-[#A55734]/10">
                        <td className="px-3 py-2 font-medium text-[#333333]">{ls.nom}</td>
                        <td className="px-3 py-2 text-[#333333]/80">
                          {ls.bucketFamille === "ville" ? "Ville" : ls.bucketFamille === "village" ? "Village" : ls.bucketFamille === "chateau" || ls.bucketFamille === "abbaye" ? "Château/Abbaye" : ls.bucketFamille === "musee" ? "Musée" : ls.bucketFamille === "rando" || ls.bucketFamille === "site_naturel" ? "Rando/Nature" : ls.bucketFamille === "plage" ? "Plage" : "Autre"}
                        </td>
                        <td className="px-3 py-2 text-[#333333]/80">{ls.departement}</td>
                        <td className="px-3 py-2 text-[#333333]">{ls.score}</td>
                        <td className="px-3 py-2 text-xs text-[#333333]/70">
                          {ls.facteurs.length > 0 ? ls.facteurs.join(", ") : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-[#333333]/70">
                          {ls.selectionTrace && ls.selectionTrace.length > 0
                            ? ls.selectionTrace.join(" | ")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-4">
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
