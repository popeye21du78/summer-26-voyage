"use client";

import Link from "next/link";
import Image from "next/image";
import HandwrittenTitle from "../components/HandwrittenTitle";
import PhotoFlipCard from "../components/PhotoFlipCard";
import CTAButtons from "../components/CTAButtons";
import LogoFade from "../components/LogoFade";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Section vidéo : dans le flux, monte avec le scroll ; transition fondue en bas */}
      <section className="relative h-screen w-full overflow-hidden" aria-hidden>
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
        {/* Logo 1 en gros sur la vidéo (monte avec le scroll, section dans le flux) */}
        <div className="absolute left-1/2 top-[32%] z-10 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex justify-center px-4">
          <Image
            src="/logo-1.png"
            alt="Voyage Voyage"
            width={480}
            height={240}
            className="h-40 w-auto object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)] sm:h-52"
            priority
            unoptimized
          />
        </div>
        {/* Motto du site sous le logo */}
        <p
          className="absolute left-1/2 top-[58%] z-10 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4 text-center text-2xl font-light tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] md:text-3xl"
          aria-hidden
        >
          Jusqu&apos;à la panne d&apos;essence
        </p>
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

      {/* Contenu : fond papier qui défile ; logo-2 entre les sections, en fondu */}
      <div
        className="relative z-10 min-h-screen px-4 pb-24 pt-8"
        style={{
          backgroundImage: "url(/fond-de-page.jpg)",
          backgroundRepeat: "repeat-y",
          backgroundSize: "100% 80vh",
          backgroundPosition: "top center",
        }}
      >
        {/* Zone qui floute progressivement le haut du parchemin ; masque en dégradé = passage progressif */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 z-[1] h-[22vh]"
          style={{
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            background: "linear-gradient(to bottom, #DDD4C7 0%, rgba(221,212,199,0.6) 35%, rgba(221,212,199,0.15) 70%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, black 0%, black 25%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 25%, transparent 100%)",
          }}
          aria-hidden
        />
        <div className="relative z-0 mx-auto max-w-2xl space-y-16 pt-[24vh]">
          <section aria-labelledby="pourquoi-heading" className="relative">
            <HandwrittenTitle id="pourquoi-heading">
              Pourquoi Voyage Voyage
            </HandwrittenTitle>
            <p className="text-[#333333]/90 leading-relaxed">
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

          <section aria-labelledby="qui-vous-heading" className="relative">
            <HandwrittenTitle id="qui-vous-heading">
              Qui êtes vous
            </HandwrittenTitle>
            <p className="mb-6 text-[#333333]/85 leading-relaxed">
              Vous partez en van, en road-trip ou en itinérance. Vous voulez un
              carnet de voyage simple, une carte de votre trajet et un book
              souvenir à partager. Voyage Voyage est fait pour vous.
            </p>
            {/* Croquis van + flèche + j'ai tenté */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative shrink-0" style={{ transform: "rotate(-3deg)" }}>
                <Image
                  src="/van-profil.png"
                  alt="Croquis van"
                  width={180}
                  height={120}
                  className="object-contain drop-shadow-md"
                  unoptimized
                />
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-8 w-10 shrink-0 text-[#A55734]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <p className="text-lg [font-family:var(--font-homemade-apple)] text-[#333333]">
                  j&apos;ai tenté
                </p>
              </div>
            </div>
          </section>

          <LogoFade />

          <CTAButtons />
        </div>
      </div>
    </main>
  );
}
