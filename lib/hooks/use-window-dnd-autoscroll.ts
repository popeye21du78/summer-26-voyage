import { useCallback, useRef } from "react";

const EDGE_PX = 110;
const MAX_STEP = 7;

/**
 * Fait défiler la fenêtre doucement quand le pointeur est proche du haut / bas
 * pendant un drag (@dnd-kit), pour listes longues (ex. beaucoup d’étapes).
 */
export function useWindowDndAutoscroll() {
  const pointerYRef = useRef(0);
  const rafRef = useRef(0);

  const onPointerMove = useCallback((e: PointerEvent) => {
    pointerYRef.current = e.clientY;
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    window.removeEventListener("pointermove", onPointerMove, true);
  }, [onPointerMove]);

  const start = useCallback(
    (initialClientY?: number) => {
      stop();
      pointerYRef.current =
        typeof initialClientY === "number" && Number.isFinite(initialClientY)
          ? initialClientY
          : window.innerHeight * 0.5;
      window.addEventListener("pointermove", onPointerMove, { capture: true });

      const tick = () => {
        const y = pointerYRef.current;
        const vh = window.innerHeight;
        let delta = 0;
        if (y > vh - EDGE_PX) {
          const t = (y - (vh - EDGE_PX)) / EDGE_PX;
          delta = MAX_STEP * t * t;
        } else if (y < EDGE_PX) {
          const t = (EDGE_PX - y) / EDGE_PX;
          delta = -MAX_STEP * t * t;
        }
        if (delta !== 0) {
          window.scrollBy({ top: delta, behavior: "auto" });
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [onPointerMove, stop]
  );

  return { start, stop };
}
