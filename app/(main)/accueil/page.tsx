import Link from "next/link";
import { cookies } from "next/headers";
import { Map, PlusCircle, UserCog } from "lucide-react";
import WelcomeLogoOverlay from "../../../components/WelcomeLogoOverlay";
import { getProfileById } from "../../../data/test-profiles";

export default async function AccueilPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  const showWelcome = params.welcome === "1";
  const cookieStore = await cookies();
  const profileId = cookieStore.get("van_auth")?.value ?? "";
  const profile = getProfileById(profileId);

  return (
    <>
      <WelcomeLogoOverlay show={showWelcome} />
      <main>
      <section
        className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4"
        aria-label="Accueil"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FAF4F0]" />
        <div className="relative z-10 w-full max-w-md text-center">
          {profile && (
            <p className="mb-2 text-sm text-[#333333]/70">
              Connecté en tant que <strong>{profile.name}</strong>
            </p>
          )}
          <Link
            href="/profil"
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#A55734] transition hover:text-[#8b4728]"
          >
            <UserCog className="h-4 w-4" aria-hidden />
            Modifier ma perso
          </Link>
          <h1 className="mb-2 text-4xl font-light text-[#333333] md:text-5xl">
            Mes voyages
          </h1>
          <p className="mb-10 text-[#333333]/80">
            Choisis de créer un nouveau voyage ou d’ouvrir un carnet existant.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/voyage/nouveau"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#A55734] bg-[#A55734] px-6 py-4 font-medium text-white transition hover:bg-[#8b4728] hover:border-[#8b4728]"
            >
              <PlusCircle className="h-5 w-5" aria-hidden />
              Créer un voyage
            </Link>
            <Link
              href="/mes-voyages"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#A55734] bg-transparent px-6 py-4 font-medium text-[#A55734] transition hover:bg-[#A55734]/10"
            >
              <Map className="h-5 w-5" aria-hidden />
              Voir mes voyages
            </Link>
          </div>
        </div>
      </section>
    </main>
    </>
  );
}
