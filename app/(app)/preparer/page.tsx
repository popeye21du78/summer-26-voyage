import { Suspense } from "react";
import CreateEntry from "@/components/preparer/CreateEntry";

export default function PreparerPage() {
  return (
    <Suspense>
      <CreateEntry />
    </Suspense>
  );
}
