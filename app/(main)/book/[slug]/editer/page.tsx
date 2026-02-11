import { notFound } from "next/navigation";
import { getSteps } from "../../../../../lib/getSteps";
import BookSectionEditor from "../../../../../components/BookSectionEditor";

type Props = { params: Promise<{ slug: string }> };

export default async function BookEditerPage({ params }: Props) {
  const { slug } = await params;
  const steps = await getSteps();
  const step = steps.find((s) => s.id === slug);
  if (!step) notFound();

  return <BookSectionEditor step={step} />;
}
