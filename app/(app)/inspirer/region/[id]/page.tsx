import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function RegionPage({ params }: Props) {
  const { id } = await params;
  redirect(`/inspirer?tab=carte&region=${encodeURIComponent(id)}`);
}
