"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { APP_SCROLL_KEY, readScrollY, writeScrollY } from "@/lib/nav-scroll-memory";

/**
 * Zone scrollable unique pour les 4 entrées du bottom menu : mémorise la position
 * par pathname (sessionStorage) pour un retour instantané sans « saut » en haut de page.
 */
export default function AppScrollShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const elRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const key = APP_SCROLL_KEY(pathname);
    const y = readScrollY(key);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!elRef.current) return;
        elRef.current.scrollTop = y ?? 0;
      });
    });
  }, [pathname]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const onScroll = () => {
      writeScrollY(APP_SCROLL_KEY(pathRef.current), el.scrollTop);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      onScroll();
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      ref={elRef}
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth [scrollbar-gutter:stable]"
    >
      <div className="min-h-0 transition-opacity duration-150 ease-out">{children}</div>
    </div>
  );
}
