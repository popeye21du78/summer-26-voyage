import { Suspense } from "react";
import ZoneFlowClient from "@/components/planifier/ZoneFlowClient";

export default function PlanifierZonePage() {
  return (
    <Suspense
      fallback={
        <main className="page-under-header px-4 py-16 text-center font-courier text-[#333]/70">
          Chargement…
        </main>
      }
    >
      <ZoneFlowClient />
    </Suspense>
  );
}
