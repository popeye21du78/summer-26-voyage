import RegionFullPage from "@/components/inspirer/RegionFullPage";

type Props = { params: Promise<{ id: string }> };

export default async function RegionPage({ params }: Props) {
  const { id } = await params;
  return <RegionFullPage regionId={id} />;
}
