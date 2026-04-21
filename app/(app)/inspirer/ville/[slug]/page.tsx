import { Suspense } from "react";
import Link from "next/link";
import { existsSync } from "fs";
import { join } from "path";
import { getSteps } from "@/lib/getSteps";
import { getAllSectionsForStep } from "@/lib/city-sections-supabase";
import { CityPhoto } from "@/components/CityPhoto";
import { CitySection } from "@/components/CitySection";
import { getLieuBySlug } from "@/lib/lieux-central";
import { getDescriptionForSlug, getPhotoSlotsFromDescription } from "@/lib/description-lieu";
import { VilleDescriptionClient } from "@/components/VilleDescriptionClient";
import { isSafeReturnPath } from "@/lib/return-to";

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

export default async function VillePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const fromParam = typeof sp?.from === "string" ? sp.from : "";
  const regionBack = typeof sp?.region === "string" ? sp.region : "";
  const returnToRaw = typeof sp?.returnTo === "string" ? sp.returnTo : "";
  let returnToSafe: string | null = null;
  try {
    const dec = decodeURIComponent(returnToRaw);
    if (isSafeReturnPath(dec)) returnToSafe = dec;
  } catch {
    /* ignore */
  }
  const backHref =
    returnToSafe ??
    (fromParam === "region" && regionBack
      ? `/inspirer/region/${regionBack}`
      : fromParam === "stars"
        ? `/inspirer?tab=stars${regionBack ? `&region=${regionBack}` : ""}`
        : fromParam === "itineraire"
          ? "/inspirer?tab=stars"
          : "/inspirer");

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
          <div className="mx-auto min-h-[40vh] max-w-2xl animate-pulse rounded-lg bg-[var(--color-bg-main)]/50 p-8" />
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

  if (lieu) {
    const nom = lieu.nom;
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-2 font-courier text-sm font-bold text-[var(--color-accent-start)] hover:text-[var(--color-accent-deep)]"
        >
          ← Retour
        </Link>
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-8 text-center">
          <h1 className="font-courier text-2xl font-bold text-white/80">{nom}</h1>
          <p className="mt-4 font-courier text-sm text-amber-800">
            Ce lieu n&apos;a pas encore de description générée.
          </p>
        </div>
      </main>
    );
  }

  const steps = await getSteps();
  const step = steps.find((s) => s.id === slug);

  if (step) {
    const cachedPhoto = step.contenu_voyage.photos[0] ?? null;
    const cachedSections = await getAllSectionsForStep(step.id);

    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-2 font-courier text-sm font-bold text-[var(--color-accent-start)] hover:text-[var(--color-accent-deep)]"
        >
          ← Retour
        </Link>
        <h1 className="mb-4 font-courier text-3xl font-bold text-white/80">{step.nom}</h1>
        <p className="mb-6 font-courier text-sm text-white/80/70">
          {step.date_prevue} · Budget prévu : {step.budget_prevu} €
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
        <div className="font-courier text-sm leading-relaxed text-white/80/90">
          <p>{step.description_culture}</p>
        </div>
        <section className="mt-10">
          <h2 className="mb-4 font-courier text-lg font-bold text-[var(--color-accent-start)]">À la carte</h2>
          <div className="rounded-xl border border-[var(--color-accent-start)]/20 bg-[var(--color-bg-main)]/50 p-4">
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

  const nom = slug.replace(/-/g, " ");
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-2 font-courier text-sm font-bold text-[var(--color-accent-start)] hover:text-[var(--color-accent-deep)]"
      >
        ← Retour
      </Link>
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-8 text-center">
        <h1 className="font-courier text-2xl font-bold text-white/80">{nom}</h1>
        <p className="mt-4 font-courier text-sm text-amber-800">
          Ce lieu n&apos;a pas encore de description.
        </p>
      </div>
    </main>
  );
}
