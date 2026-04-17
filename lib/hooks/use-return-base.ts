"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Path + query actuels pour construire des liens `returnTo` sans `useSearchParams` (Suspense). */
export function useReturnBase(): string {
  const pathname = usePathname();
  const [base, setBase] = useState("");
  useEffect(() => {
    setBase(`${window.location.pathname}${window.location.search}`);
  }, [pathname]);
  return base || pathname;
}
