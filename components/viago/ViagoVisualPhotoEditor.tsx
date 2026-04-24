"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ImagePlus, Type, X } from "lucide-react";
import {
  scaleToViagoSizes,
  type ViagoPhotoItem,
  type ViagoPhotoOverlayLayout,
  type ViagoPhotoTextPosition,
} from "@/lib/viago-storage";
import { compressImageFileToDataUrl } from "@/lib/viago-compress-image";
import { sampleLuminanceFromSrc } from "@/lib/viago-image-tone";
import { ViagoRichCourier } from "./ViagoRichText";

/**
 * Éditeur photo Viago — version minimaliste « story ».
 *
 * Objectif UX : pas de menu à choix multiples, pas d'options avancées —
 *  1. on charge la photo (file picker ouvert direct si rien en entrée),
 *  2. la photo remplit l'écran,
 *  3. on peut poser un bloc texte au doigt :
 *      - tap dans la photo sans texte     → ajoute un bloc
 *      - glisser                          → déplace
 *      - pincer (2 doigts)                → redimensionne
 *      - double-tap                       → ouvre le champ texte
 *  4. un gros bouton « Valider » en bas ferme et renvoie l'item.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (item: ViagoPhotoItem) => void;
  initialUrl?: string | null;
  initialTitle?: string;
  initialAnecdote?: string;
  initialOverlay?: ViagoPhotoOverlayLayout | null;
  initialLayoutBelow?: boolean;
  initialTextTone?: "light" | "dark";
  initialTextPosition?: ViagoPhotoTextPosition;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function ViagoVisualPhotoEditor({
  open,
  onClose,
  onConfirm,
  initialUrl = null,
  initialTitle = "",
  initialAnecdote = "",
  initialOverlay = null,
  initialLayoutBelow = false,
  initialTextTone,
  initialTextPosition,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [anecdote, setAnecdote] = useState("");
  const [xPct, setXPct] = useState(50);
  const [yPct, setYPct] = useState(84);
  const [scale, setScale] = useState(1);
  const [luminance, setLuminance] = useState<number | null>(null);
  const [textBlockOpen, setTextBlockOpen] = useState(false);
  const [lineEditOpen, setLineEditOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; x0: number; y0: number } | null>(null);
  const pinchRef = useRef<{ dist: number; scale0: number } | null>(null);
  const lastTapRef = useRef(0);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const u = initialUrl?.trim() || null;
    setUrl(u);
    setTitle(initialTitle);
    setAnecdote(initialAnecdote);
    setError(null);
    if (initialOverlay) {
      setXPct(initialOverlay.xPct);
      setYPct(initialOverlay.yPct);
      setScale(initialOverlay.scale);
    } else if (initialLayoutBelow) {
      setXPct(50);
      setYPct(84);
      setScale(1);
    } else {
      const pos = initialTextPosition ?? "overlay-bottom";
      setXPct(50);
      setYPct(pos === "overlay-top" ? 16 : pos === "overlay-bottom" ? 84 : 50);
      setScale(1);
    }
    setTextBlockOpen(Boolean(initialTitle.trim() || initialAnecdote.trim()));
    setLineEditOpen(false);
  }, [
    open,
    initialUrl,
    initialTitle,
    initialAnecdote,
    initialOverlay,
    initialLayoutBelow,
    initialTextPosition,
  ]);

  /**
   * Si l'éditeur ouvre sans photo, on déclenche immédiatement le file picker.
   * Résultat : l'user pose le doigt sur "Photo depuis la galerie" et arrive
   * directement devant son rouleau iOS/Android, zéro friction.
   */
  const autoPickedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      autoPickedRef.current = false;
      return;
    }
    if (url) return;
    if (autoPickedRef.current) return;
    autoPickedRef.current = true;
    const id = window.setTimeout(() => {
      fileRef.current?.click();
    }, 120);
    return () => window.clearTimeout(id);
  }, [open, url]);

  useEffect(() => {
    if (!open || !url) {
      setLuminance(null);
      return;
    }
    sampleLuminanceFromSrc(url, xPct, yPct, setLuminance);
  }, [open, url, xPct, yPct]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !open) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setScale((s) => clamp(s + (e.deltaY > 0 ? -0.04 : 0.04), 0.65, 1.65));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  const effectiveTone: "light" | "dark" =
    initialTextTone ?? (luminance != null && luminance > 0.52 ? "dark" : "light");

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const hintedByExtension = /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|svg)$/i.test(
      file.name || ""
    );
    const hintedByType = typeof file.type === "string" && file.type.startsWith("image/");
    if (!hintedByExtension && !hintedByType && file.type) {
      setError("Ce fichier n'est pas une image.");
      return;
    }
    setPhotoBusy(true);
    setError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setUrl(dataUrl);
    } catch {
      setError(
        "Impossible de lire cette image sur ce téléphone. Essaie une photo JPG/PNG depuis la galerie."
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  /** Tap sur la photo SANS texte → ajoute un bloc vide centré/bas, ouvre l'édition. */
  const onPhotoAreaTap = () => {
    if (!url) {
      fileRef.current?.click();
      return;
    }
    if (textBlockOpen) return;
    setTextBlockOpen(true);
    setXPct(50);
    setYPct(84);
    setScale(1);
    setLineEditOpen(true);
  };

  const onPointerDownText = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragMovedRef.current = false;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      x0: xPct,
      y0: yPct,
    };
  };

  const onPointerMoveText = (e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 10) dragMovedRef.current = true;
    const dxp = (dx / rect.width) * 100;
    const dyp = (dy / rect.height) * 100;
    setXPct(clamp(dragRef.current.x0 + dxp, 6, 94));
    setYPct(clamp(dragRef.current.y0 + dyp, 6, 94));
  };

  const onPointerUpText = (e: React.PointerEvent) => {
    const moved = dragMovedRef.current;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!moved) handleDoubleTap();
  };

  const onTouchStartPinch = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { dist, scale0: scale };
    }
  };

  const onTouchMovePinch = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const ratio = dist / pinchRef.current.dist;
    setScale(clamp(pinchRef.current.scale0 * ratio, 0.65, 1.65));
  };

  const onTouchEndPinch = () => {
    pinchRef.current = null;
  };

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      setLineEditOpen(true);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, []);

  const buildItem = (): ViagoPhotoItem | null => {
    const u = url?.trim();
    if (!u) {
      setError("Ajoute une photo avant de valider.");
      return null;
    }
    const sizes = scaleToViagoSizes(scale);
    const base: ViagoPhotoItem = {
      url: u,
      photoTitle: title.trim() || undefined,
      anecdote: anecdote.trim() || undefined,
      titleSize: sizes.title,
      bodySize: sizes.body,
      textPosition: "overlay-bottom",
      overlayLayout: { xPct, yPct, scale },
    };
    return base;
  };

  const handleConfirm = () => {
    const item = buildItem();
    if (!item) return;
    onConfirm(item);
    onClose();
  };

  const titleSz =
    scale >= 1.05 ? "text-lg md:text-xl" : scale < 0.9 ? "text-xs" : "text-sm";
  const bodySz =
    scale >= 1.05 ? "text-sm md:text-base" : scale < 0.9 ? "text-[10px]" : "text-xs";

  const hasText = Boolean(title.trim() || anecdote.trim());

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[240] flex flex-col bg-[#0f0a08]"
        >
          <input
            ref={fileRef}
            type="file"
            /**
             * iOS : `accept="image/*"` seul déclenche la conversion HEIC→JPEG
             * automatique. On ne liste PAS .heic pour conserver ce comportement.
             */
            accept="image/*"
            className="sr-only"
            onClick={(e) => {
              (e.currentTarget as HTMLInputElement).value = "";
            }}
            onChange={handlePickFile}
          />

          {/* Zone photo plein écran */}
          <div
            ref={containerRef}
            className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
            onTouchStart={onTouchStartPinch}
            onTouchMove={onTouchMovePinch}
            onTouchEnd={onTouchEndPinch}
            onClick={onPhotoAreaTap}
          >
            {url ? (
              <img
                src={url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#3d2618] to-[#1a100c] px-6">
                <ImagePlus className="h-14 w-14 text-[var(--color-accent-start)]" />
                <p className="text-center font-courier text-base font-bold text-[#f5e6dc]">
                  Touche pour choisir une photo
                </p>
                <p className="text-center font-courier text-xs text-[#f5e6dc]/60">
                  Elle remplira l&apos;écran — tu pourras poser un texte par-dessus.
                </p>
              </div>
            )}

            {url && textBlockOpen && hasText && (
              <div
                role="button"
                tabIndex={0}
                onPointerDown={onPointerDownText}
                onPointerMove={onPointerMoveText}
                onPointerUp={onPointerUpText}
                onPointerCancel={(ev) => {
                  dragRef.current = null;
                  try {
                    ev.currentTarget.releasePointerCapture(ev.pointerId);
                  } catch {
                    /* ignore */
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                }}
                className={`absolute max-w-[min(92vw,340px)] cursor-grab touch-none px-3 py-2 text-left font-courier active:cursor-grabbing ${
                  effectiveTone === "light"
                    ? "text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.95)]"
                    : "text-[#1a1410] [text-shadow:0_1px_2px_rgba(255,255,255,0.5)]"
                }`}
              >
                <div
                  className={`rounded-md px-2 py-1.5 ${
                    effectiveTone === "light"
                      ? "bg-black/25 backdrop-blur-[2px]"
                      : "bg-white/55 backdrop-blur-[2px]"
                  }`}
                >
                  {title.trim() ? (
                    <div className={`font-bold ${titleSz}`}>
                      <ViagoRichCourier text={title} />
                    </div>
                  ) : null}
                  {anecdote.trim() ? (
                    <div className={`mt-1 leading-snug ${bodySz}`}>
                      <ViagoRichCourier text={anecdote} />
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Hints visuels discrets */}
            {url && !textBlockOpen && (
              <div className="pointer-events-none absolute left-1/2 bottom-[22%] -translate-x-1/2 rounded-full bg-black/45 px-3 py-1.5 font-courier text-[10px] font-bold uppercase tracking-widest text-white/90 backdrop-blur-md">
                Touche la photo pour écrire
              </div>
            )}
            {url && textBlockOpen && hasText && (
              <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 font-courier text-[9px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-md">
                Glisser · pincer · double tap
              </div>
            )}

            {/* Bouton fermer */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-md"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Barre d'actions — toujours sur le dessus (Valider fiable au doigt). */}
          <div className="relative z-[300] flex shrink-0 items-stretch justify-center gap-2 border-t border-white/10 bg-[#150f0d]/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
            <button
              type="button"
              disabled={photoBusy}
              onClick={() => fileRef.current?.click()}
              className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 font-courier text-sm font-bold text-[#fde8e0] shadow-sm disabled:opacity-50"
            >
              <ImagePlus className="h-5 w-5" />
              {url ? "Remplacer" : "Photo"}
            </button>
            <button
              type="button"
              disabled={!url}
              onClick={() => {
                if (!url) {
                  fileRef.current?.click();
                  return;
                }
                if (!textBlockOpen) {
                  setTextBlockOpen(true);
                  setXPct(50);
                  setYPct(84);
                  setScale(1);
                }
                setLineEditOpen(true);
              }}
              className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 font-courier text-sm font-bold text-[#fde8e0] shadow-sm disabled:opacity-40"
            >
              <Type className="h-5 w-5" />
              Texte
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex min-h-[52px] flex-[1.2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-mid)] font-courier text-base font-bold uppercase tracking-wider text-white shadow-lg"
            >
              <Check className="h-5 w-5" />
              Valider
            </button>
          </div>

          {error && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] flex justify-center">
              <p className="rounded-full bg-red-500/90 px-4 py-2 text-center font-courier text-xs font-bold text-white shadow-lg">
                {error}
              </p>
            </div>
          )}

          {/* Édition texte (title + anecdote) */}
          <AnimatePresence>
            {lineEditOpen && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="absolute inset-x-0 bottom-0 z-[320] max-h-[55vh] rounded-t-3xl border border-[var(--color-accent-start)]/25 bg-[#1f1612] p-4 shadow-2xl"
              >
                <p className="font-courier text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent-start)]">
                  Texte · utilise **mot** pour du gras
                </p>
                <label className="mt-3 block font-courier text-xs text-[#f5e6dc]/80">
                  Titre
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-courier text-sm text-[#FFFBF7] outline-none focus:ring-1 focus:ring-[var(--color-accent-start)]"
                  placeholder="Optionnel"
                  autoFocus
                />
                <label className="mt-3 block font-courier text-xs text-[#f5e6dc]/80">
                  Texte
                </label>
                <textarea
                  value={anecdote}
                  onChange={(e) => setAnecdote(e.target.value)}
                  rows={4}
                  className="mt-1 w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-courier text-sm text-[#FFFBF7] outline-none focus:ring-1 focus:ring-[var(--color-accent-start)]"
                  placeholder="Ton souvenir, une émotion…"
                />
                <div className="mt-4 flex gap-2">
                  {hasText && (
                    <button
                      type="button"
                      onClick={() => {
                        setTitle("");
                        setAnecdote("");
                        setTextBlockOpen(false);
                        setLineEditOpen(false);
                      }}
                      className="rounded-xl border border-red-500/40 px-4 py-3 font-courier text-xs font-bold text-red-300"
                    >
                      Supprimer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (title.trim() || anecdote.trim()) setTextBlockOpen(true);
                      setLineEditOpen(false);
                    }}
                    className="flex-1 rounded-xl bg-[var(--color-accent-start)] py-3 font-courier text-sm font-bold uppercase tracking-wider text-white shadow-md"
                  >
                    OK
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
