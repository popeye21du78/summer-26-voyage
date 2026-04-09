import { Suspense } from "react";
import Link from "next/link";
import { existsSync } from "fs";
import { join } from "path";
import { getSteps } from "../../../../lib/getSteps";
import { getAllSectionsForStep } from "../../../../lib/city-sections-supabase";
import { CityPhoto } from "../../../../components/CityPhoto";
import { CitySection } from "../../../../components/CitySection";
import { getLieuBySlug } from "../../../../lib/lieux-central";
import { getDescriptionForSlug, getPhotoSlotsFromDescription } from "../../../../lib/description-lieu";
import { VilleDescriptionClient } from "../../../../components/VilleDescriptionClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

const SECTION_ORDER = [
  "en_quelques_mots",
  "point_historique",
  "bien_manger_boire",
  "arriver_van",
  "que_faire",
  "anecdote",
] as const;

function PasGenerePage({
  slug,
  nom,
  backHref = "/carte-villes",
}: {
  slug: string;
  nom: string;
  backHref?: string;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-2 text-sm text-[#A55734] transition-colors hover:text-[#8b4728]"
      >
        ← Retour à la carte
      </Link>
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-8 text-center">
        <h1 className="text-2xl font-light text-[#333]">{nom}</h1>
        <p className="mt-4 text-amber-800">
          Ce lieu n&apos;a pas encore de description générée.
        </p>
        <p className="mt-2 text-sm text-[#333]/70">
          Les descriptions sont créées par lots via l&apos;API Batch OpenAI. Consulte la page{" "}
          <Link href="/batch-status" className="text-[#A55734] underline hover:no-underline">
            Batch Descriptions
          </Link>{" "}
          pour suivre l&apos;avancement.
        </p>
      </div>
    </main>
  );
}

export default async function VillePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const fromVoyage = sp?.from === "voyage";
  const vRaw = sp?.v;
  const voyagePrevuSlug =
    typeof vRaw === "string" && /^[a-zA-Z0-9_-]+$/.test(vRaw) ? vRaw : null;
  const backVoyageCarte = voyagePrevuSlug
    ? `/voyage/${voyagePrevuSlug}/prevu#carte-voyage`
    : null;
  const backHref = backVoyageCarte ?? (fromVoyage ? "/accueil#on-repart" : "/carte-villes");

  // 1) Vérifier si description existe (lieu depuis carte-villes)
  const description = getDescriptionForSlug(slug);
  const lieu = getLieuBySlug(slug);

  if (description) {
    const nom = lieu?.nom ?? slug.replace(/-/g, " ");
    const photosDir = join(process.cwd(), "photos", slug);
    const hasPhotosFolder = existsSync(photosDir);
    const photoSlots = getPhotoSlotsFromDescription(description);

    return (
      <Suspense
        fallback={
          <div className="mx-auto min-h-[40vh] max-w-2xl animate-pulse rounded-lg bg-[#FFF2EB]/50 p-8" />
        }
      >
        <VilleDescriptionClient
          slug={slug}
          nom={nom}
          description={description}
          hasPhotosFolder={hasPhotosFolder}
          photoSlots={photoSlots}
        />
      </Suspense>
    );
  }

  // 2) Lieu carte-villes sans description → pas encore généré (évite l'appel Supabase)
  if (lieu) {
    const nom = lieu.nom;
    return (
      <div className="px-4 py-8">
        <PasGenerePage slug={slug} nom={nom} backHref={backHref} />
      </div>
    );
  }

  // 3) Fallback : étape de voyage (Supabase / mock) — uniquement si slug pas dans carte-villes
  const steps = await getSteps();
  const step = steps.find((s) => s.id === slug);

  if (step) {
    const cachedPhoto = step.contenu_voyage.photos[0] ?? null;
    const cachedSections = await getAllSectionsForStep(step.id);

    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href={backVoyageCarte ?? "/accueil"}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          ← {backVoyageCarte ? "Retour au voyage" : "Retour"}
        </Link>
        <h1 className="mb-4 text-4xl font-light text-[#333333]">{step.nom}</h1>
        <p className="mb-6 text-[#333333]/70">
          {step.date_prevue} • Budget prévu : {step.budget_prevu} €
        </p>
        <div className="polaroid relative mb-8 aspect-video w-full overflow-hidden">
          <CityPhoto
            stepId={step.id}
            ville={step.nom}
            initialUrl={cachedPhoto}
            alt={step.nom}
            className="absolute inset-0"
            showChangeButton
          />
        </div>
        <div className="prose prose-[#333333]">
          <p className="text-[#333333]/90">{step.description_culture}</p>
        </div>
        <section className="mt-12">
          <h2 className="mb-6 text-xl font-light text-[#A55734]">À la carte</h2>
          <div className="rounded-lg border border-[#A55734]/30 bg-[#FAF4F0]/50 p-4">
            {SECTION_ORDER.map((sectionType) => (
              <CitySection
                key={sectionType}
                stepId={step.id}
                ville={step.nom}
                sectionType={sectionType}
                initialContent={cachedSections[sectionType] ?? null}
              />
            ))}
          </div>
        </section>
      </main>
    );
  }

  // 4) Ni lieu ni étape : pas encore généré
  const nom = slug.replace(/-/g, " ");
  return (
    <div className="px-4 py-8">
      <PasGenerePage slug={slug} nom={nom} backHref={backHref} />
    </div>
  );
}
