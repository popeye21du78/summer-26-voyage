import { notFound } from "next/navigation";
import { getSteps } from "../../../../lib/getSteps";
import { getAllSectionsForStep } from "../../../../lib/city-sections-supabase";
import { CityPhoto } from "../../../../components/CityPhoto";
import { CitySection } from "../../../../components/CitySection";

type Props = { params: Promise<{ slug: string }> };

const SECTION_ORDER = [
  "en_quelques_mots",
  "point_historique",
  "bien_manger_boire",
  "arriver_van",
  "que_faire",
  "anecdote",
] as const;

export default async function VillePage({ params }: Props) {
  const { slug } = await params;
  const steps = await getSteps();
  const step = steps.find((s) => s.id === slug);
  if (!step) notFound();

  const cachedPhoto = step.contenu_voyage.photos[0] ?? null;
  const cachedSections = await getAllSectionsForStep(step.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <a
        href="/#carte"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[#A55734] transition-colors hover:text-[#8b4728]"
      >
        ← Retour à la carte
      </a>
      <h1 className="mb-4 text-4xl font-light text-[#333333]">
        {step.nom}
      </h1>
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
        <h2 className="mb-6 text-xl font-light text-[#A55734]">
          À la carte
        </h2>
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
