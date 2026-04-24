import InspirerTabs from "@/components/inspirer/InspirerTabs";

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function InspirerPage({ searchParams }: Props) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const sp = searchParams ? await searchParams : {};
  const initialTab = typeof sp?.tab === "string" ? sp.tab : undefined;
  const initialRegion = typeof sp?.region === "string" ? sp.region : undefined;

  return (
    // Hauteur DÉFINITE (pas seulement min-height) : sans ça, la cascade de
    // `h-full` / `flex-1` dans InspirerTabs / InspirerStars / InspirerAmis
    // tombait à 0px et rien ne s'affichait (top nav + filtres visibles, reste
    // noir). Avec une hauteur concrète = 100dvh - bottom nav, tous les
    // enfants flex peuvent se cadrer proprement et les onglets ont une vraie
    // zone de contenu.
    <div
      className="flex min-h-0 flex-col"
      style={{ height: "calc(100dvh - 5rem)" }}
    >
      <InspirerTabs
        mapboxAccessToken={mapboxToken}
        initialTab={initialTab}
        initialRegion={initialRegion}
      />
    </div>
  );
}
