"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CreateItineraire from "@/components/preparer/CreateItineraire";
import CreateSuccess from "@/components/preparer/CreateSuccess";

function Inner() {
  const sp = useSearchParams();
  const done = sp.get("done") === "1";

  if (done) {
    return <CreateSuccess />;
  }

  return <CreateItineraire />;
}

export default function ItinerairePage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
