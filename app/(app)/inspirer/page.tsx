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
    <div className="flex min-h-0 flex-1 flex-col [min-height:calc(100dvh-5rem)]">
      <InspirerTabs
        mapboxAccessToken={mapboxToken}
        initialTab={initialTab}
        initialRegion={initialRegion}
      />
    </div>
  );
}
