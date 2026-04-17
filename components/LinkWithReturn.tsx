"use client";

import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { withReturnTo } from "@/lib/return-to";

type Props = ComponentProps<typeof Link>;

/**
 * Ajoute `returnTo` = URL courante (path + query) pour que « Retour » ramène au bon écran.
 * Évite `useSearchParams` (Suspense obligatoire au build) en lisant `window` côté client.
 */
export default function LinkWithReturn({ href, ...rest }: Props) {
  const pathname = usePathname();
  const [here, setHere] = useState("");
  useEffect(() => {
    setHere(`${window.location.pathname}${window.location.search}`);
  }, [pathname]);

  const to = typeof href === "string" ? withReturnTo(href, here || pathname) : href;
  return <Link href={to} {...rest} />;
}
