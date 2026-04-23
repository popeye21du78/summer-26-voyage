"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ImageIcon, Type, X } from "lucide-react";
import {
  scaleToViagoSizes,
  type ViagoPhotoItem,
  type ViagoPhotoOverlayLayout,
  type ViagoPhotoTextPosition,
} from "@/lib/viago-storage";
import { compressImageFileToDataUrl } from "@/lib/viago-compress-image";
import { sampleLuminanceFromSrc } from "@/lib/viago-image-tone";
import { ViagoRichCourier } from "./ViagoRichText";

type LayoutMode = "overlay" | "below";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (item: ViagoPhotoItem) => void;
  /** Valeurs initiales (édition ou création) */
  initialUrl?: string | null;
  initialTitle?: string;
  initialAnecdote?: string;
  initialOverlay?: ViagoPhotoOverlayLayout | null;
  /** Sans overlay = texte sous la photo (legacy) */
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
  const [yPct, setYPct] = useState(50);
  const [scale, setScale] = useState(1);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("overlay");
  const [textTone, setTextTone] = useState<"light" | "dark" | "auto">("auto");
  const [luminance, setLuminance] = useState<number | null>(null);
  const [textBlockOpen, setTextBlockOpen] = useState(false);
  const [lineEditOpen, setLineEditOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textSelected, setTextSelected] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; x0: number; y0: number } | null>(null);
  const pinchRef = useRef<{ dist: number; scale0: number } | null>(null);
  const lastTapRef = useRef(0);
  const longPressRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setUrl(initialUrl?.trim() || null);
    setTitle(initialTitle);
    setAnecdote(initialAnecdote);
    if (initialLayoutBelow) {
      setLayoutMode("below");
    } else if (initialOverlay) {
      setLayoutMode("overlay");
      setXPct(initialOverlay.xPct);
      setYPct(initialOverlay.yPct);
      setScale(initialOverlay.scale);
    } else {
      setLayoutMode("overlay");
      const pos = initialTextPosition ?? "overlay-bottom";
      if (pos === "overlay-top") {
        setXPct(50);
        setYPct(16);
      } else if (pos === "overlay-bottom") {
        setXPct(50);
        setYPct(84);
      } else {
        setXPct(50);
        setYPct(50);
      }
      setScale(1);
    }
    setTextTone(initialTextTone ?? "auto");
    setTextBlockOpen(Boolean(initialTitle.trim() || initialAnecdote.trim()));
    setLineEditOpen(false);
    setAdvancedOpen(false);
    setError(null);
  }, [
    open,
    initialUrl,
    initialTitle,
    initialAnecdote,
    initialOverlay,
    initialLayoutBelow,
    initialTextTone,
    initialTextPosition,
  ]);

  useEffect(() => {
    if (!open || !url || layoutMode !== "overlay") {
      setLuminance(null);
      return;
    }
    sampleLuminanceFromSrc(url, xPct, yPct, setLuminance);
  }, [open, url, xPct, yPct, layoutMode]);

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
      setScale((s) => clamp(s + (e.deltaY > 0 ? -0.04 : 0.04), 0.65, 1.45));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, layoutMode]);

  const effectiveTone: "light" | "dark" =
    textTone === "auto"
      ? luminance != null && luminance > 0.52
        ? "dark"
        : "light"
      : textTone;

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) {
      setError("Image requise.");
      return;
    }
    setPhotoBusy(true);
    setError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setUrl(dataUrl);
    } catch {
      setError("Impossible de lire cette image.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const onPointerDownText = (e: React.PointerEvent) => {
    if (layoutMode !== "overlay" || !containerRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragMovedRef.current = false;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      x0: xPct,
      y0: yPct,
    };
    setTextSelected(true);
    /* Long press n’ouvre plus le panneau « Plus » (captait les taps et bloquait Valider). Utilise le bouton Plus en haut à droite. */
  };

  const onPointerMoveText = (e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 12) dragMovedRef.current = true;
    const dxp = (dx / rect.width) * 100;
    const dyp = (dy / rect.height) * 100;
    setXPct(clamp(dragRef.current.x0 + dxp, 8, 92));
    setYPct(clamp(dragRef.current.y0 + dyp, 8, 92));
  };

  const endLongPressTimer = () => {
    if (longPressRef.current != null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const onPointerUpText = (e: React.PointerEvent) => {
    endLongPressTimer();
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
    setScale(clamp(pinchRef.current.scale0 * ratio, 0.65, 1.45));
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

  const addTextBlock = () => {
    setTextBlockOpen(true);
    setLayoutMode("overlay");
    if (!title.trim() && !anecdote.trim()) {
      setTitle("Un moment");
      setAnecdote("**Ton souvenir** — un détail, une émotion.");
    }
    setLineEditOpen(true);
  };

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
      textTone: textTone === "auto" ? undefined : textTone,
    };
    if (layoutMode === "below") {
      return {
        ...base,
        textPosition: "below",
        overlayLayout: undefined,
      };
    }
    return {
      ...base,
      textPosition: "overlay-bottom",
      overlayLayout: { xPct, yPct, scale },
    };
  };

  const handleConfirm = () => {
    const item = buildItem();
    if (!item) return;
    onConfirm(item);
    onClose();
  };

  const applyPresetPosition = (preset: "top" | "center" | "bottom") => {
    setLayoutMode("overlay");
    setXPct(50);
    if (preset === "top") setYPct(16);
    else if (preset === "center") setYPct(50);
    else setYPct(84);
    setAdvancedOpen(false);
  };

  const applyStylePreset = (kind: "title" | "caption") => {
    if (kind === "title") setScale(1.15);
    else setScale(0.88);
    setAdvancedOpen(false);
  };

  const clearText = () => {
    setTitle("");
    setAnecdote("");
    setTextBlockOpen(false);
    setAdvancedOpen(false);
  };

  const titleSz =
    scale >= 1.05 ? "text-base md:text-lg" : scale < 0.9 ? "text-xs" : "text-sm";
  const bodySz =
    scale >= 1.05 ? "text-sm md:text-base" : scale < 0.9 ? "text-[10px]" : "text-xs";

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
            accept="image/*,.heic,.heif"
            className="sr-only"
            onClick={(e) => {
              (e.currentTarget as HTMLInputElement).value = "";
            }}
            onChange={handlePickFile}
          />

          {/* Zone principale */}
          <div
            ref={containerRef}
            className="relative min-h-0 flex-1 touch-none overflow-hidden"
            onTouchStart={onTouchStartPinch}
            onTouchMove={onTouchMovePinch}
            onTouchEnd={onTouchEndPinch}
          >
            {url ? (
              <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#3d2618] to-[#1a100c] px-6">
                <p className="text-center font-courier text-sm text-[#f5e6dc]/85">
                  Touche « Photo » pour choisir une image — elle remplit l’écran.
                </p>
              </div>
            )}

            {url && layoutMode === "overlay" && textBlockOpen && (title.trim() || anecdote.trim()) && (
              <button
                type="button"
                onPointerDown={onPointerDownText}
                onPointerMove={onPointerMoveText}
                onPointerUp={onPointerUpText}
                onPointerCancel={(ev) => {
                  endLongPressTimer();
                  dragRef.current = null;
                  try {
                    ev.currentTarget.releasePointerCapture(ev.pointerId);
                  } catch {
                    /* ignore */
                  }
                }}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                }}
                className={`absolute max-w-[min(92vw,340px)] cursor-grab touch-manipulation px-3 py-2 text-left font-courier active:cursor-grabbing ${
                  textSelected ? "ring-2 ring-[var(--color-accent-start)]/90 ring-offset-2 ring-offset-black/20" : ""
                } ${
                  effectiveTone === "light"
                    ? "text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.95)]"
                    : "text-[#1a1410] [text-shadow:0_1px_2px_rgba(255,255,255,0.5)]"
                }`}
              >
                <span
                  className={`block rounded-md px-1 py-0.5 ${
                    effectiveTone === "light" ? "bg-black/25 backdrop-blur-[2px]" : "bg-white/55 backdrop-blur-[2px]"
                  }`}
                >
                  {title.trim() ? (
                    <span className={`block font-bold ${titleSz}`}>
                      <ViagoRichCourier text={title} />
                    </span>
                  ) : null}
                  {anecdote.trim() ? (
                    <span className={`mt-1 block leading-snug ${bodySz}`}>
                      <ViagoRichCourier text={anecdote} />
                    </span>
                  ) : null}
                </span>
                <span className="mt-2 block text-center font-courier text-[9px] font-bold uppercase tracking-wider text-white/55">
                  Glisser · pincer pour taille · double tap pour écrire
                </span>
              </button>
            )}

            {layoutMode === "below" && url && (title.trim() || anecdote.trim()) && (
              <div className="absolute inset-x-0 bottom-0 max-h-[38%] overflow-y-auto bg-gradient-to-t from-[#0f0a08] via-[#0f0a08]/95 to-transparent px-4 pb-6 pt-10">
                <div
                  className={`rounded-xl px-3 py-3 font-courier ${
                    effectiveTone === "light" ? "text-white" : "text-[#f5ebe3]"
                  }`}
                  onDoubleClick={() => setLineEditOpen(true)}
                >
                  {title.trim() ? (
                    <p className={`font-bold ${titleSz}`}>
                      <ViagoRichCourier text={title} />
                    </p>
                  ) : null}
                  {anecdote.trim() ? (
                    <p className={`mt-1 ${bodySz}`}>
                      <ViagoRichCourier text={anecdote} />
                    </p>
                  ) : null}
                  <p className="mt-2 text-center text-[9px] uppercase tracking-wide text-white/40">
                    Double tap pour modifier
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setAdvancedOpen((o) => !o)}
              className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 rounded-full bg-black/35 px-2.5 py-1 font-courier text-[10px] font-bold uppercase tracking-wide text-white/80 backdrop-blur-md"
            >
              Plus
            </button>
          </div>

          {/* Barre d’actions — toujours au-dessus des overlays (Valider fiable au doigt). */}
          <div className="relative z-[300] flex shrink-0 items-stretch justify-center gap-2 border-t border-white/10 bg-[var(--color-bg-gradient-end)]/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
            <button
              type="button"
              disabled={photoBusy}
              onClick={() => fileRef.current?.click()}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-mid)] font-courier text-sm font-bold text-white shadow-lg disabled:opacity-50"
            >
              <ImageIcon className="h-5 w-5" />
              Photo
            </button>
            <button
              type="button"
              onClick={addTextBlock}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border border-[var(--color-accent-start)]/50 bg-white/10 font-courier text-sm font-bold text-[#fde8e0]"
            >
              <Type className="h-5 w-5" />
              Texte
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent-start)] font-courier text-sm font-bold text-white shadow-md"
            >
              <Check className="h-5 w-5" />
              Valider
            </button>
          </div>

          {error && (
            <p className="absolute bottom-24 left-0 right-0 text-center font-courier text-xs text-red-300">
              {error}
            </p>
          )}

          {/* Édition texte (double tap) */}
          <AnimatePresence>
            {lineEditOpen && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="absolute inset-x-0 bottom-0 z-[250] max-h-[55vh] rounded-t-3xl border border-[var(--color-accent-start)]/25 bg-[#1f1612] p-4 shadow-2xl"
              >
                <p className="font-courier text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent-start)]">
                  Texte · **gras** avec astérisques
                </p>
                <label className="mt-3 block font-courier text-xs text-[#f5e6dc]/80">Titre</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-courier text-sm text-[#FFFBF7] outline-none focus:ring-1 focus:ring-[var(--color-accent-start)]"
                  placeholder="Optionnel"
                />
                <label className="mt-3 block font-courier text-xs text-[#f5e6dc]/80">Texte</label>
                <textarea
                  value={anecdote}
                  onChange={(e) => setAnecdote(e.target.value)}
                  rows={4}
                  className="mt-1 w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-courier text-sm text-[#FFFBF7] outline-none focus:ring-1 focus:ring-[var(--color-accent-start)]"
                  placeholder="Ton texte…"
                />
                <button
                  type="button"
                  onClick={() => setLineEditOpen(false)}
                  className="mt-4 w-full rounded-xl bg-[var(--color-accent-start)] py-3 font-courier text-sm font-bold text-white"
                >
                  OK
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Options avancées */}
          <AnimatePresence>
            {advancedOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute left-0 right-0 top-0 z-[245] flex items-end justify-center bg-black/50 p-3"
                style={{ bottom: "5.75rem" }}
                onClick={() => setAdvancedOpen(false)}
              >
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1f1612] p-4 shadow-xl"
                >
                  <p className="font-courier text-xs font-bold uppercase tracking-wide text-[var(--color-accent-start)]">
                    Édition avancée
                  </p>
                  <p className="mt-2 font-courier text-[11px] text-[#c9b8ad]">Position du bloc</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["top", "center", "bottom"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => applyPresetPosition(p)}
                        className="rounded-full border border-white/15 px-3 py-1.5 font-courier text-[11px] text-[#fde8e0]"
                      >
                        {p === "top" ? "Haut" : p === "center" ? "Centre" : "Bas"}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 font-courier text-[11px] text-[#c9b8ad]">Style</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyStylePreset("title")}
                      className="rounded-full border border-white/15 px-3 py-1.5 font-courier text-[11px] text-[#fde8e0]"
                    >
                      Titre fort
                    </button>
                    <button
                      type="button"
                      onClick={() => applyStylePreset("caption")}
                      className="rounded-full border border-white/15 px-3 py-1.5 font-courier text-[11px] text-[#fde8e0]"
                    >
                      Légende
                    </button>
                  </div>
                  <p className="mt-3 font-courier text-[11px] text-[#c9b8ad]">Contraste</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["auto", "light", "dark"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTextTone(t);
                          setAdvancedOpen(false);
                        }}
                        className={`rounded-full border px-3 py-1.5 font-courier text-[11px] ${
                          textTone === t
                            ? "border-[var(--color-accent-start)] bg-[var(--color-accent-start)]/25 text-[#fde8e0]"
                            : "border-white/15 text-[#fde8e0]"
                        }`}
                      >
                        {t === "auto" ? "Auto" : t === "light" ? "Texte clair" : "Texte foncé"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode("below");
                      setAdvancedOpen(false);
                    }}
                    className="mt-4 w-full rounded-xl border border-dashed border-[var(--color-accent-start)]/40 py-2 font-courier text-[11px] text-[#f5c4b8]"
                  >
                    Afficher le texte sous la photo
                  </button>
                  <button
                    type="button"
                    onClick={clearText}
                    className="mt-2 w-full rounded-xl border border-red-500/40 py-2 font-courier text-[11px] text-red-300"
                  >
                    Supprimer tout le texte
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen(false)}
                    className="mt-3 w-full rounded-xl bg-white/10 py-2 font-courier text-sm text-white"
                  >
                    Fermer
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
