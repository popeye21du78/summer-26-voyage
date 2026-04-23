"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * Transition douce entre les 4 entrées de la bottom nav.
 *
 * Choix V2 (après retour user : « je ne veux jamais que la top nav ou la
 * bottom nav disparaisse pendant une transition ») :
 *
 *   AVANT → on slidait la page horizontalement. Le problème : la top nav
 *   étant rendue À L'INTÉRIEUR du contenu de chaque route (InspirerTabs,
 *   MonEspaceShell), elle slidait avec le reste du contenu et semblait
 *   « disparaître » puis « revenir » pendant la transition.
 *
 *   APRÈS → pure cross-fade en opacité + micro-scale imperceptible.
 *   - La nav du haut (qui est en `position: absolute; top: 0; z-index: 120`
 *     à l'intérieur de chaque page) reste PERÇUE comme stable : la nouvelle
 *     nav apparaît exactement au-dessus de l'ancienne, pendant que cette
 *     dernière se fond. L'œil de l'user voit « une nav continue ».
 *   - La bottom nav est déjà HORS du container animé (rendue directement
 *     dans `app/(app)/layout.tsx`), elle ne bouge donc pas du tout.
 *   - Durée courte (230 ms), easing iOS → pas de sensation de lenteur,
 *     mais pas de « blink » brutal non plus.
 *
 * Les routes profondes (ex : /inspirer/region/xxx) sont également cross-fadées
 * avec la même durée. Pas besoin de différencier la direction puisque
 * la transition n'est plus latérale.
 */
const NAV_ORDER = ["/accueil", "/inspirer", "/preparer", "/mon-espace"] as const;

function matchIndex(pathname: string): number {
  for (let i = NAV_ORDER.length - 1; i >= 0; i--) {
    if (pathname === NAV_ORDER[i] || pathname.startsWith(NAV_ORDER[i] + "/")) {
      return i;
    }
  }
  return -1;
}

/**
 * Routes dont la page possède DÉJÀ leur propre animation d'entrée/sortie
 * (bottom sheet draggable, modal plein écran, etc.). Pour ces routes :
 *   - On NE joue PAS le cross-fade d'AppTabTransition à l'entrée, sinon
 *     on cumule deux animations concurrentes → sensation de « cut ».
 *   - On NE joue PAS non plus la sortie : la page précédente doit apparaître
 *     instantanément sous la sheet qui descend.
 * Typiquement : pages ville ouvertes via VillePageSheet.
 */
function routeManagesOwnTransition(pathname: string): boolean {
  return /\/inspirer\/ville\//.test(pathname);
}

export default function AppTabTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const previousIndexRef = useRef<number>(matchIndex(pathname));
  const currentIndex = matchIndex(pathname);
  const previousPathRef = useRef<string>(pathname);

  useEffect(() => {
    previousIndexRef.current = currentIndex;
    previousPathRef.current = pathname;
  }, [currentIndex, pathname]);

  /**
   * Si la route actuelle OU la précédente gère sa propre transition (sheet),
   * on désactive le cross-fade pour ne pas empiler deux anim concurrentes.
   * La sheet (VillePageSheet) se charge de l'animation d'entrée/sortie ;
   * l'user voit directement la sheet qui monte/descend, sans fade parasite.
   */
  const isSheetRoute = routeManagesOwnTransition(pathname);
  const wasSheetRoute = routeManagesOwnTransition(previousPathRef.current);
  const skipFade = isSheetRoute || wasSheetRoute;

  return (
    <div className="relative min-h-full w-full">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={pathname}
          initial={skipFade ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={skipFade ? { opacity: 1 } : { opacity: 0 }}
          transition={{
            duration: skipFade ? 0 : 0.22,
            ease: [0.32, 0.72, 0.25, 1],
          }}
          className="min-h-full w-full"
          style={{ willChange: skipFade ? "auto" : "opacity" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
