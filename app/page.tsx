"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import HandwrittenTitle from "../components/HandwrittenTitle";
import PhotoFlipCard from "../components/PhotoFlipCard";
import CTAButtons from "../components/CTAButtons";
import LogoFade from "../components/LogoFade";
import LandingBandeau from "../components/LandingBandeau";
import QuiEtesVousScroll from "../components/QuiEtesVousScroll";
import { ChevronDown } from "lucide-react";

type SplashPhase = "fadeIn" | "hold" | "cover" | "bgFadeOut" | "done";

const FADE_IN_MS = 600;
const HOLD_MS = 1000;
const COVER_MS = 1000; // le calque orange recouvre le logo progressivement en 1 s
const BG_FADE_OUT_MS = 600;

export default function HomePage() {
  const [splashPhase, setSplashPhase] = useState<SplashPhase>("fadeIn");
  const [logoVisible, setLogoVisible] = useState(false);

  // Passer : on enchaîne sur le fondu du fond orange puis on masque (même effet qu’à la fin de l’animation)
  const skipSplash = useCallback(() => {
    setSplashPhase((p) => (p === "done" ? p : "bgFadeOut"));
  }, []);

  // Déclencher le fondu d’entrée du logo après le premier paint
  useEffect(() => {
    const raf = requestAnimationFrame(() => setLogoVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Chaque phase dure le temps prévu ; à la fin tout le splash disparaît en fondu
  useEffect(() => {
    if (splashPhase === "done") return;

    const phaseDuration: Record<SplashPhase, number> = {
      fadeIn: FADE_IN_MS,
      hold: HOLD_MS,
      cover: COVER_MS,
      bgFadeOut: BG_FADE_OUT_MS,
    };
    const nextPhase: Record<SplashPhase, SplashPhase> = {
      fadeIn: "hold",
      hold: "cover",
      cover: "bgFadeOut",
      bgFadeOut: "done",
    };

    const t = setTimeout(() => setSplashPhase(nextPhase[splashPhase]), phaseDuration[splashPhase]);
    return () => clearTimeout(t);
  }, [splashPhase]);

  const showSplash = splashPhase !== "done";

  return (
    <main className="h-[100dvh] w-full max-w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory overscroll-contain">
      {/* Bandeau : affiché seulement après la fin de l’animation de départ */}
      {!showSplash && <LandingBandeau />}

      {/* Écran d’accueil : fond orange, logo centré en fondu, puis calque orange recouvre le logo en 1 s, puis tout disparaît */}
      {showSplash && (
        <button
          type="button"
          className="fixed inset-0 z-[100] h-full w-full focus:outline-none transition-opacity duration-[600ms] ease-out"
          style={{ opacity: splashPhase === "bgFadeOut" ? 0 : 1 }}
          onClick={skipSplash}
          aria-label="Passer à la page d’accueil"
        >
          {/* Fond orange (arrière-plan, remplit toute la page) */}
          <div className="absolute inset-0">
            <Image
              src="/logo-a-bis-fond-orange.png"
              alt=""
              fill
              className="object-cover object-center"
              priority
              unoptimized
              sizes="100vw 100vh"
            />
          </div>

          {/* Logo centré : même taille et position que sur la vidéo pour continuité */}
          <div className="absolute left-1/2 top-1/2 z-10 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center px-4">
            <div
              className="transition-opacity ease-out"
              style={{
                transitionDuration: `${FADE_IN_MS}ms`,
                opacity: logoVisible ? 1 : 0,
              }}
            >
              <Image
                src="/logo-a-page-daccueil.png"
                alt="Voyage Voyage"
                width={600}
                height={300}
                className="h-56 w-auto object-contain sm:h-72 md:h-80"
                priority
                unoptimized
              />
            </div>
          </div>

          {/* Calque orange par-dessus : se décale de la gauche vers la droite en 1 s (recouvre le logo) */}
          <div
            className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
          >
            <div
              className="absolute inset-0 transition-transform ease-out"
              style={{
                transitionDuration: `${COVER_MS}ms`,
                transform: splashPhase === "cover" || splashPhase === "bgFadeOut" ? "translateX(0)" : "translateX(-100%)",
              }}
            >
              <Image
                src="/logo-a-bis-fond-orange.png"
                alt=""
                fill
                className="object-cover object-center"
                priority
                unoptimized
                sizes="100vw 100vh"
              />
            </div>
          </div>
        </button>
      )}

      {/* Hero : section vidéo */}
      <section className="relative h-[100dvh] w-full shrink-0 flex-none snap-start snap-always overflow-hidden" aria-hidden>
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        >
          <source src="/van-qui-roule-tt-le-monde.mp4" type="video/mp4" />
        </video>
        {/* Voile obscurcissant : léger mais suffisant pour que le motto se détache en blanc */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.45) 100%)",
            boxShadow: "inset 0 0 120px 30px rgba(0,0,0,0.2)",
          }}
          aria-hidden
        />
        {/* Logo et motto centrés au milieu de l'écran */}
        <div className="absolute left-1/2 top-1/2 z-10 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-2 px-4">
          <Image
            src="/logo-b-voyage-voyage.png"
            alt="Voyage Voyage"
            width={600}
            height={300}
            className="h-56 w-auto object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)] sm:h-72 md:h-80"
            priority
            unoptimized
          />
          <p
            className="text-center text-lg font-light tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)] md:text-xl"
            style={{ color: "rgb(165, 53, 0)" }}
            aria-hidden
          >
            Jusqu&apos;à la panne d&apos;essence
          </p>
          <button
            type="button"
            onClick={() => document.getElementById("premiere-section")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-2 flex justify-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-opacity hover:opacity-80 focus:outline-none"
            style={{ color: "rgb(165, 53, 0)" }}
            aria-label="Aller à la première section"
          >
            <ChevronDown className="h-8 w-8 animate-bounce sm:h-9 sm:w-9" strokeWidth={2} />
          </button>
        </div>
        {/* Zone floutée en bas : masque en dégradé = passage progressif du clair au flou */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[30%]"
          style={{
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            background: "linear-gradient(to top, #DDD4C7 0%, rgba(221,212,199,0.75) 45%, rgba(221,212,199,0.2) 75%, transparent 100%)",
            maskImage: "linear-gradient(to top, black 0%, black 20%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to top, black 0%, black 20%, transparent 100%)",
          }}
          aria-hidden
        />
      </section>

      {/* Présentation : Pourquoi + Qui sommes nous */}
      <section
        id="premiere-section"
        className="relative z-10 h-[100dvh] w-full shrink-0 flex-none snap-start snap-always overflow-y-auto overflow-x-hidden pb-24 pt-16"
        style={{
          background: "linear-gradient(180deg, rgba(165, 87, 52, 0.06) 0%, rgba(165, 87, 52, 0.04) 50%, rgba(250, 244, 240, 0.98) 100%)",
        }}
      >
        <div className="relative z-0 mx-auto max-w-2xl space-y-16 px-4 pt-12">
          {/* Pourquoi Voyage Voyage : titre même typo que le motto + court texte centré */}
          <section aria-labelledby="pourquoi-heading" className="relative flex min-h-[50vh] flex-col items-center justify-center py-12 text-center">
            <h2
              id="pourquoi-heading"
              className="font-motto mb-6 text-2xl font-light tracking-wide text-[#333333] md:text-3xl"
            >
              Pourquoi Voyage Voyage
            </h2>
            <p className="max-w-lg text-[#333333]/90 leading-relaxed">
              Voyage Voyage, c’est le carnet de bord de tes trajets en van : une seule
              place pour planifier, noter et garder en souvenir chaque étape.
            </p>
          </section>

          <LogoFade />

          <section aria-labelledby="qui-nous-heading" className="relative">
            <HandwrittenTitle id="qui-nous-heading">
              Qui sommes nous
            </HandwrittenTitle>
            <p className="mb-8 text-[#333333]/85 leading-relaxed">
              Nous sommes une petite équipe passionnée par la route et le van-life.
              Ce site est pensé pour ceux qui veulent garder une trace de leurs
              voyages tout en gardant le contrôle de leurs données.
            </p>

            {/* 3 photos : cadres carrés, grande taille, centrées */}
            <div className="relative mx-auto w-[95%] max-w-4xl space-y-10">
              <div className="flex justify-center" style={{ width: "100%" }}>
                <div style={{ transform: "rotate(-1.5deg)", width: "100%" }}>
                  <PhotoFlipCard
                    frontSrc="/barcelone.jpeg"
                    alt="Barcelone"
                    width={280}
                    height={280}
                    aspectRatio={1}
                    fullWidth
                    cardClassName="pt-6 pr-6"
                    tapeClassName="absolute -left-1 top-2 z-10 h-8 w-16"
                    tapeStyle={{ transform: "rotate(-12deg)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                    textRotation={-1}
                  >
                  <p>Barcelone en trois noms : Gaudi, Messi et Manuel Valls.</p>
                  <p>Barcelone en trois jours : vendredi, samedi et dimanche.</p>
                  <p>Barcelone en trois lieux : la Rambla, la Sagrada Familia et le Camp Nou.</p>
                  <p>…</p>
                  <p>
                    Et nous visitons le parc Güell ! Nous enchaînons depuis un an les métropoles accessibles directement en avion, et la plage de Barcelone est bondée. Nous voudrions nous éloigner, trouver la crique qui nous fera craquer. Vanité car nous n&apos;avons pas de van. Nous comprenons que sans lui, nous sommes condamnés à voyager de Ville en Ville…
                  </p>
                </PhotoFlipCard>
                </div>
              </div>

              <div className="flex justify-center" style={{ width: "100%" }}>
                <div style={{ transform: "rotate(2deg)", width: "100%" }}>
                  <PhotoFlipCard
                    frontSrc="/pouilles.jpeg"
                    alt="Pouilles"
                    width={260}
                    height={260}
                    aspectRatio={1}
                    fullWidth
                    cardClassName="pt-5 pl-4"
                    tapeClassName="absolute -right-2 top-1 z-10 h-6 w-14"
                    tapeStyle={{ transform: "rotate(8deg)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                    textRotation={1.5}
                  >
                  <p>Les pouilles. Et les pouilleux qui les traversent.</p>
                  <p>
                    Se pavaner le sac au dos et se vanner en riant jaune sur le van qu&apos;on aurait dû louer, il ne nous reste que ça.
                  </p>
                  <p>
                    Nous parcourons 20 km par jour. Nous ne verrons qu&apos;à peine 1% de ces terres sauvages du sud de l&apos;Italie, ou les transports en commun sont plus rares encore que les gens qui travaillent. Nous comprenons que sans ce satané van, nous pouvons dire adieu aux trésors cachés tout au fond du talon de la botte italienne, parce que tout au fond de nos chaussures, nos talons meurtris n&apos;en peuvent déjà plus.
                  </p>
                </PhotoFlipCard>
                </div>
              </div>

              <div className="flex justify-center" style={{ width: "100%" }}>
                <div style={{ transform: "rotate(-2.5deg)", width: "100%" }}>
                  <PhotoFlipCard
                    frontSrc="/lisbonne.jpeg"
                    alt="Lisbonne"
                    width={270}
                    height={270}
                    aspectRatio={1}
                    fullWidth
                    cardClassName="pt-6 pr-4"
                    tapeClassName="absolute left-2 top-0 z-10 h-7 w-12"
                    tapeStyle={{ transform: "rotate(6deg)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                    textRotation={-0.8}
                  >
                  <p>Nous nous apprêtons à aller surfer.</p>
                  <p>
                    Nous avons rejoint cette plage dans le van du moniteur de surf. Nous ne résistons pas à l&apos;envie de nous prendre en photo avec lui (le van, pas le moniteur). Cette fois, c&apos;est la bonne, nous décidons de nous lancer : nos prochaines vacances, nous les passerons en van.
                  </p>
                  <p>Go.</p>
                </PhotoFlipCard>
                </div>
              </div>
            </div>
          </section>

          <LogoFade />
        </div>
      </section>

      {/* Diapo 1, Diapo 2, Diapo 3 : enfants directs de main pour le snap global */}
      <QuiEtesVousScroll />

      {/* Footer */}
      <section className="relative h-[100dvh] w-full shrink-0 flex-none snap-start snap-always overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-2xl space-y-16 px-4 pt-16 pb-24">
          <LogoFade />
          <CTAButtons />
        </div>
      </section>
    </main>
  );
}
