"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { Compass, Home, PlusCircle, User } from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";

const NAV_ITEMS = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/inspirer", label: "S'inspirer", icon: Compass },
  { href: "/preparer", label: "Préparer", icon: PlusCircle },
  { href: "/mon-espace", label: "Mon espace", icon: User },
] as const;

const SPRING = { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.75 };

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const prefetch = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router]
  );

  return (
    <nav className="bottom-nav-shell" aria-label="Navigation principale">
      <LayoutGroup id="bottom-nav">
        <div className="bottom-nav-shell-inner">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                scroll={false}
                prefetch
                onPointerEnter={() => prefetch(href)}
                className="bottom-nav-link group"
              >
                {/**
                 * Capsule "verre profond" partagée — se déplace en spring quand l'onglet
                 * actif change. Un seul élément motion dans tout le DOM, géré par layoutId.
                 */}
                {active ? (
                  <motion.span
                    layoutId="bottom-nav-active-pill"
                    className="bottom-nav-active-pill"
                    transition={SPRING}
                    aria-hidden
                  />
                ) : null}
                {/**
                 * Point de lumière accent également partagé — suit la capsule
                 * avec un léger décalage visuel.
                 */}
                {active ? (
                  <motion.span
                    layoutId="bottom-nav-active-glow"
                    className="bottom-nav-local-light"
                    transition={SPRING}
                    aria-hidden
                  />
                ) : null}
                <Icon
                  className={`bottom-nav-icon h-[20px] w-[20px] transition-[stroke-width,color] duration-150 ${
                    active ? "bottom-nav-icon--active" : "bottom-nav-icon--idle"
                  }`}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span
                  className={`bottom-nav-label relative z-[1] ${active ? "bottom-nav-label--active" : "bottom-nav-label--muted"}`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>
  );
}
