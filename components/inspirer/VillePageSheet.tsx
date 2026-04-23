"use client";

import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Shell "bottom sheet" qui enveloppe la page ville.
 *
 * Objectif UX (demandé par l'user) :
 *  - À l'arrivée sur la page ville, la fiche MONTE d'en bas plutôt que
 *    de remplacer brutalement l'écran → impression d'un tiroir qui s'ouvre.
 *  - Pour la fermer, on la TIRE vers le bas (drag sur la poignée) au lieu
 *    d'avoir à chercher un bouton « Retour ». Le bouton reste accessible
 *    uniquement dans le hero pour le desktop ou l'accessibilité.
 *
 * Détails d'implémentation :
 *  - La poignée `SheetGrabHandle` en haut concentre les gestes de drag.
 *    On ne drag JAMAIS depuis le contenu scrollable — ça entre en conflit
 *    avec le scroll natif et rend le swipe-to-dismiss peu fiable.
 *  - `router.back()` est appelé quand le drag atteint un seuil de hauteur
 *    OU une vélocité suffisante. On inverse le motion pour ne pas couper
 *    net visuellement : on glisse la sheet vers le bas, puis on revient
 *    à l'historique précédent au prochain frame.
 *  - Sur desktop, la sheet prend la quasi totalité de la hauteur mais
 *    conserve des coins arrondis et une ombre pour marquer la séparation
 *    avec la page d'arrière-plan (page précédente figée).
 */
const CLOSE_DRAG_DISTANCE = 140;
const CLOSE_DRAG_VELOCITY = 700;

export default function VillePageSheet({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const y = useMotionValue(0);
  /**
   * Le scrim derrière la sheet s'opacifie à mesure que la sheet descend :
   * feedback visuel cohérent avec l'intensité du drag.
   */
  const scrimOpacity = useTransform(y, [0, 260], [0.55, 0]);
  const sheetRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    /**
     * On laisse ≈120ms à l'animation de sortie, puis on déclenche le `router.back`.
     * Si l'historique ne peut pas revenir en arrière (entrée directe sur URL),
     * on tombe sur /inspirer — valeur par défaut cohérente avec les ville-pages.
     */
    window.setTimeout(() => {
      try {
        if (window.history.length > 1) router.back();
        else router.push("/inspirer");
      } catch {
        router.push("/inspirer");
      }
    }, 130);
  }, [closing, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const dy = info.offset.y;
    const vy = info.velocity.y;
    if (dy > CLOSE_DRAG_DISTANCE || vy > CLOSE_DRAG_VELOCITY) {
      close();
    } else {
      /** Revient à la position d'origine si seuil non atteint. */
      y.set(0);
    }
  };

  return (
    <>
      {/**
       * Scrim / arrière-plan : un simple dégradé sombre, on reste hors pointer
       * quand la sheet est en place (un tap sur le scrim très étroit n'est pas
       * proposé pour éviter des fermetures accidentelles sur mobile).
       */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[180] bg-black"
        style={{ opacity: scrimOpacity }}
      />

      <motion.div
        ref={sheetRef}
        /** Animation d'entrée : glisse depuis le bas (100% hauteur offscreen). */
        initial={{ y: "100%" }}
        animate={closing ? { y: "100%" } : { y: 0 }}
        transition={
          closing
            ? { type: "tween", duration: 0.22, ease: [0.32, 0.72, 0.25, 1] }
            : { type: "spring", damping: 32, stiffness: 300, mass: 0.85 }
        }
        style={{ y }}
        className="fixed inset-0 z-[185] flex flex-col overflow-hidden rounded-t-3xl bg-[var(--color-bg-main)] shadow-[0_-28px_60px_rgba(0,0,0,0.55)]"
      >
        {/**
         * Poignée de drag : SEUL élément qui reçoit le drag.
         * Scrollable enfant n'est PAS drag-enabled → conflit pinch/scroll résolu.
         */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.55 }}
          onDrag={(_, info) => {
            if (info.offset.y > 0) y.set(info.offset.y);
          }}
          onDragEnd={onDragEnd}
          className="relative z-10 flex h-9 shrink-0 items-center justify-center bg-[var(--color-bg-main)] pt-2"
          aria-label="Poignée — glisser vers le bas pour fermer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") close();
          }}
        >
          <span className="h-1 w-14 rounded-full bg-white/35 shadow-[0_1px_6px_rgba(0,0,0,0.35)] ring-1 ring-white/10" />
        </motion.div>

        {/**
         * Contenu scrollable : overflow-y-auto + overscroll-contain pour que
         * le bounce iOS ne déclenche pas un close accidentel.
         */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </motion.div>
    </>
  );
}
