"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Route, Loader2 } from "lucide-react";
import QuizPreVoyage from "../../../../components/QuizPreVoyage";
import type { QuizPreVoyageAnswers } from "../../../../data/quiz-types";
import type { QuizIdentiteAnswers } from "../../../../data/quiz-types";
import { getQuizStorageKey } from "../../../../data/test-profiles";
import { quizToProfilRecherche } from "../../../../lib/quiz-to-profil";
import type { ProfilRecherche } from "../../../../lib/quiz-to-profil";
import { quizToProfilVille } from "../../../../lib/quiz-to-profil-ville";
import { applyProportions, type LieuScore } from "../../../../lib/score-lieux";
import type { LieuPoint, LieuType } from "../../../../lib/lieux-types";

const QUIZ_PREVOYAGE_KEY = "quiz_prevoyage";
const VOYAGE_SESSION_KEY = "voyage_profil";
const VOYAGE_PROFIL_VILLE_KEY = "voyage_profil_ville";
const VOYAGE_LIEUX_KEY = "voyage_lieux";
const VOYAGE_SUBMITTED_KEY = "voyage_submitted";
const VOYAGE_TOP_PERCENT_KEY = "voyage_top_percent";

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

interface ItinDay {
  day: number;
  isStayDay: boolean;
  points: { nom: string; lat: number; lng: number; famille: string; score: number; departement: string }[];
  sleepAt: { nom: string; lat: number; lng: number } | null;
  sleepNights: number;
}
interface ItinResult {
  days: ItinDay[];
  totalDistanceKm: number;
  clustersCount: number;
  totalVisits: number;
  from: string;
  to: string;
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

  // Itinerary state
  const [itinerary, setItinerary] = useState<ItinResult | null>(null);
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const [itinError, setItinError] = useState("");

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
              // Restauration du voyage depuis sessionStorage (retour depuis page ville)
              const submitted = sessionStorage.getItem(VOYAGE_SUBMITTED_KEY);
              if (submitted === "true") {
                const storedProfil = sessionStorage.getItem(VOYAGE_SESSION_KEY);
                const storedLieux = sessionStorage.getItem(VOYAGE_LIEUX_KEY);
                const storedTop = sessionStorage.getItem(VOYAGE_TOP_PERCENT_KEY);
                if (storedProfil) {
                  try {
                    setProfil(JSON.parse(storedProfil));
                  } catch {
                    // ignorer
                  }
                }
                if (storedLieux) {
                  try {
                    setLieuxScored(JSON.parse(storedLieux));
                  } catch {
                    // ignorer
                  }
                }
                if (storedTop) {
                  const n = parseInt(storedTop, 10);
                  if (!isNaN(n)) setTopPercent(n);
                }
                setSubmitted(true);
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

  useEffect(() => {
    if (submitted && typeof window !== "undefined") {
      sessionStorage.setItem(VOYAGE_TOP_PERCENT_KEY, String(topPercent));
    }
  }, [submitted, topPercent]);

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
      const profilVille = quizToProfilVille(identiteAnswers, answers);
      setProfil(p);
      sessionStorage.setItem(VOYAGE_SESSION_KEY, JSON.stringify(p));
      sessionStorage.setItem(VOYAGE_PROFIL_VILLE_KEY, JSON.stringify(profilVille));
      sessionStorage.setItem(VOYAGE_SUBMITTED_KEY, "true");
      sessionStorage.setItem(VOYAGE_TOP_PERCENT_KEY, String(topPercent));

      setLoadingLieux(true);
      fetch("/api/score-lieux", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profil: p }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.lieux) {
            setLieuxScored(data.lieux);
            sessionStorage.setItem(VOYAGE_LIEUX_KEY, JSON.stringify(data.lieux));
          }
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
                  villeLinkSearch="?from=voyage"
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

          {/* Bouton + resultat itineraire */}
          {displayedLieux.length >= 2 && (
            <ItinerarySection
              lieux={displayedLieux}
              profil={profil}
              itinerary={itinerary}
              loading={loadingItinerary}
              error={itinError}
              onGenerate={async () => {
                setLoadingItinerary(true);
                setItinError("");
                try {
                  const startLieu = displayedLieux[0];
                  const res = await fetch("/api/itinerary", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      lieux: displayedLieux,
                      start: { lat: Number(startLieu.lat), lng: Number(startLieu.lng) },
                      nights: profil?.dureeJours ? profil.dureeJours - 1 : 7,
                      rythme: profil?.rythme ?? "normal",
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Erreur");
                  setItinerary(data);
                } catch (e: any) {
                  setItinError(e.message);
                } finally {
                  setLoadingItinerary(false);
                }
              }}
            />
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

/* ── Itinerary section with Mapbox map ── */

const MapGL = dynamic(() => import("react-map-gl/mapbox").then((m) => m.default), { ssr: false });
const MarkerGL = dynamic(() => import("react-map-gl/mapbox").then((m) => m.Marker), { ssr: false });
const SourceGL = dynamic(() => import("react-map-gl/mapbox").then((m) => m.Source), { ssr: false });
const LayerGL = dynamic(() => import("react-map-gl/mapbox").then((m) => m.Layer), { ssr: false });

const DAY_COLORS = [
  "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6",
  "#1abc9c", "#e91e63", "#ff9800", "#00bcd4", "#8bc34a", "#ff5722",
];
const FAMILLE_ICONS: Record<string, string> = {
  ville: "🏙", village: "🏘", chateau: "🏰", plage: "🏖",
  rando: "🥾", site_naturel: "🌿", musee: "🎨",
  patrimoine: "⛪", abbaye: "⛪", autre: "📍",
};
const FRANCE_BOUNDS: [[number, number], [number, number]] = [[-5.5, 41], [9.5, 51.5]];

function ItinerarySection({
  lieux,
  profil,
  itinerary,
  loading,
  error,
  onGenerate,
}: {
  lieux: LieuScore[];
  profil: ProfilRecherche | null;
  itinerary: ItinResult | null;
  loading: boolean;
  error: string;
  onGenerate: () => void;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const mapRef = useRef<any>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Fetch real road routes
  useEffect(() => {
    if (!itinerary || !token) return;
    const pts: { id: string; nom: string; coordonnees: { lat: number; lng: number } }[] = [];
    for (const day of itinerary.days) {
      if (day.isStayDay) continue;
      for (const p of day.points) {
        const id = p.nom.toLowerCase().replace(/\s+/g, "-");
        if (!pts.find((x) => x.id === id)) {
          pts.push({ id, nom: p.nom, coordonnees: { lat: p.lat, lng: p.lng } });
        }
      }
    }
    if (pts.length < 2) return;
    setLoadingRoutes(true);
    fetch("/api/directions/route-geometry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steps: pts }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => data.singleLine && setRouteGeoJSON(data.singleLine))
      .catch(() => {
        const coords = pts.map((p) => [p.coordonnees.lng, p.coordonnees.lat]);
        setRouteGeoJSON({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }],
        });
      })
      .finally(() => setLoadingRoutes(false));
  }, [itinerary, token]);

  // Fit bounds
  useEffect(() => {
    if (!itinerary || !mapRef.current) return;
    const all: [number, number][] = [];
    for (const d of itinerary.days) for (const p of d.points) all.push([p.lng, p.lat]);
    if (all.length < 2) return;
    const lngs = all.map((c) => c[0]), lats = all.map((c) => c[1]);
    try {
      mapRef.current.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, duration: 1200 });
    } catch {}
  }, [itinerary, routeGeoJSON]);

  const markers = useMemo(() => {
    if (!itinerary) return [];
    const m: any[] = [];
    for (const d of itinerary.days) {
      for (const p of d.points) {
        const isSleep = !!(d.sleepAt && p.nom === d.sleepAt.nom);
        m.push({ ...p, dayNum: d.day, isSleep, isStay: d.isStayDay, sleepNights: d.sleepNights });
      }
    }
    return m;
  }, [itinerary]);

  const nights = profil?.dureeJours ? profil.dureeJours - 1 : 7;

  return (
    <div className="space-y-4 pt-4 border-t border-[#A55734]/20">
      <div className="flex items-center gap-3">
        <Route className="h-5 w-5 text-[#A55734]" />
        <h2 className="text-lg font-medium text-[#333]">Itinéraire</h2>
      </div>

      {!itinerary && (
        <div className="rounded-lg border border-[#A55734]/20 bg-[#FFF2EB]/30 p-4">
          <p className="mb-3 text-sm text-[#333]/70">
            {lieux.length} lieux sélectionnés · {nights} nuits · {profil?.rythme ?? "normal"}
          </p>
          <button
            onClick={onGenerate}
            disabled={loading}
            className="flex items-center gap-2 rounded bg-[#A55734] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#8a4629] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
            {loading ? "Génération de l'itinéraire..." : "Générer l'itinéraire"}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {itinerary && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="relative h-[500px] w-full overflow-hidden rounded-lg border border-[#A55734]/20">
              {loadingRoutes && (
                <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs text-[#A55734] shadow">
                  <Loader2 className="h-3 w-3 animate-spin" /> Tracé des routes...
                </div>
              )}
              {token ? (
                <MapGL
                  ref={mapRef}
                  mapboxAccessToken={token}
                  initialViewState={{ longitude: 2.5, latitude: 46.5, zoom: 5.5 }}
                  minZoom={5}
                  maxZoom={14}
                  maxBounds={FRANCE_BOUNDS}
                  mapStyle="mapbox://styles/mapbox/light-v11"
                  style={{ width: "100%", height: "100%" }}
                >
                  {routeGeoJSON && (
                    <SourceGL id="itin-route" type="geojson" data={routeGeoJSON} lineMetrics>
                      <LayerGL id="itin-line" type="line" paint={{ "line-color": "#A55734", "line-width": 4, "line-opacity": 0.7 }} />
                      <LayerGL id="itin-glow" type="line" paint={{ "line-color": "#A55734", "line-width": 8, "line-opacity": 0.15 }} />
                    </SourceGL>
                  )}
                  {markers.map((m: any, i: number) => {
                    const color = DAY_COLORS[(m.dayNum - 1) % DAY_COLORS.length];
                    if (m.isSleep) {
                      return (
                        <MarkerGL key={`s-${i}`} longitude={m.lng} latitude={m.lat} anchor="center">
                          <div className="flex items-center justify-center rounded-full border-[3px] border-white shadow-md" style={{ width: 28, height: 28, background: "#2c3e50" }} title={m.nom + " — Nuit"}>
                            <span className="text-xs font-bold text-white">{m.sleepNights}</span>
                          </div>
                        </MarkerGL>
                      );
                    }
                    if (m.isStay) return null;
                    return (
                      <MarkerGL key={`v-${i}`} longitude={m.lng} latitude={m.lat} anchor="center">
                        <div className="rounded-full border-2 border-white shadow" style={{ width: 14, height: 14, background: color }} title={m.nom + " — J" + m.dayNum} />
                      </MarkerGL>
                    );
                  })}
                </MapGL>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#333]/40">Token Mapbox manquant</div>
              )}
            </div>
          </div>

          {/* Day panel */}
          <div className="max-h-[500px] overflow-y-auto rounded-lg border border-[#A55734]/20 bg-white p-4">
            <div className="mb-4 rounded-lg bg-[#FAF4F0] p-3 text-sm">
              <div className="font-medium text-[#A55734]">{itinerary.from} → {itinerary.to}</div>
              <div className="mt-1 text-[#333]/70">
                {itinerary.days.length} jours · ~{itinerary.totalDistanceKm} km · {itinerary.totalVisits} visites · {itinerary.clustersCount} zones
              </div>
            </div>
            {itinerary.days.map((day) => {
              const color = DAY_COLORS[(day.day - 1) % DAY_COLORS.length];
              return (
                <div key={day.day} className="mb-3">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-semibold text-[#333]">
                      Jour {day.day}
                      {day.isStayDay && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">SÉJOUR</span>}
                    </span>
                  </div>
                  {day.isStayDay ? (
                    <div className="ml-5 text-xs text-[#333]/60">Journée libre à {day.sleepAt?.nom}</div>
                  ) : (
                    <div className="ml-5 space-y-0.5">
                      {day.points.map((p, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs text-[#333]/80">
                          <span>{FAMILLE_ICONS[p.famille] ?? "📍"}</span>
                          <span>{p.nom}</span>
                          <span className="text-[10px] text-[#333]/40">({p.departement})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {day.sleepAt && <div className="ml-5 mt-0.5 text-xs text-[#A55734]">🛏 {day.sleepAt.nom} ({day.sleepNights}n)</div>}
                  {!day.sleepAt && !day.isStayDay && <div className="ml-5 mt-0.5 text-xs text-[#333]/40">→ fin du voyage</div>}
                </div>
              );
            })}
            <button
              onClick={onGenerate}
              disabled={loading}
              className="mt-4 w-full rounded border border-[#A55734]/30 py-2 text-xs font-medium text-[#A55734] transition hover:bg-[#A55734]/10 disabled:opacity-50"
            >
              {loading ? "Regénération..." : "Regénérer l'itinéraire"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

