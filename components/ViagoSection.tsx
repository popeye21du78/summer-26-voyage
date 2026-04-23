"use client";

import { useState, useEffect, useRef } from "react";
import { useInView } from "framer-motion";
import { motion } from "framer-motion";
import Link from "next/link";
import { Image, FileText, X, Pencil } from "lucide-react";
import type { Step } from "../types";
import {
  defaultOverlayFromPosition,
  getViagoStepContent,
  saveViagoStepContent,
  type ViagoPhotoItem,
  type ViagoPhotoOverlayLayout,
  type ViagoPhotoTextPosition,
  type ViagoStepContent,
  type ViagoTextSize,
} from "../lib/viago-storage";
import { sampleLuminanceFromSrc } from "../lib/viago-image-tone";
import ViagoVisualPhotoEditor from "./viago/ViagoVisualPhotoEditor";
import { ViagoRichCourier } from "./viago/ViagoRichText";
import { compressImageFileToDataUrl } from "../lib/viago-compress-image";
import { LieuResolvedBackground } from "./LieuResolvedBackground";
import { slugFromNom } from "@/lib/slug-from-nom";

type Props = {
  step: Step;
  voyageId: string;
  index: number;
  readOnly?: boolean;
  variant?: "dark" | "light";
  /** Profil propriétaire du contenu Viago (ami ou soi) — voir lib/viago-storage */
  storageScope?: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function toInputDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const SIZE_CLASS: Record<ViagoTextSize, string> = {
  xs: "text-[10px] leading-snug",
  sm: "text-xs leading-snug",
  base: "text-sm leading-snug",
  lg: "text-base leading-snug",
};

function PhotoPolaroid({
  item,
  i,
  isInView,
  isDark,
  readOnly,
  onRemove,
  onEdit,
}: {
  item: ViagoPhotoItem;
  i: number;
  isInView: boolean;
  isDark: boolean;
  readOnly: boolean;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const [lum, setLum] = useState<number | null>(null);
  const pos: ViagoPhotoTextPosition = item.textPosition ?? "below";
  const titleSz = SIZE_CLASS[item.titleSize ?? "base"];
  const bodySz = SIZE_CLASS[item.bodySize ?? "sm"];
  const hasTitle = Boolean(item.photoTitle?.trim());
  const hasBody = Boolean(item.anecdote?.trim());
  const legacyOverlay =
    !item.overlayLayout &&
    (pos === "overlay-bottom" || pos === "overlay-top") &&
    (hasTitle || hasBody);

  useEffect(() => {
    if (!item.overlayLayout) {
      const raf = requestAnimationFrame(() => setLum(null));
      return () => cancelAnimationFrame(raf);
    }
    let cancelled = false;
    const apply = (n: number | null) => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (!cancelled) setLum(n);
      });
    };
    sampleLuminanceFromSrc(
      item.url,
      item.overlayLayout.xPct,
      item.overlayLayout.yPct,
      apply
    );
    return () => {
      cancelled = true;
    };
  }, [item.url, item.overlayLayout]);

  const freeTone =
    item.textTone ??
    (lum != null && lum > 0.52 ? ("dark" as const) : ("light" as const));

  return (
    <motion.div
      initial={{ opacity: 0, rotate: -2 }}
      animate={isInView ? { opacity: 1, rotate: i % 2 === 0 ? -1 : 1 } : {}}
      transition={{ delay: 0.3 + i * 0.05 }}
      className="group relative max-w-[min(100%,280px)]"
      style={{
        transform: `rotate(${i % 2 === 0 ? "-1.5deg" : "1.5deg"})`,
      }}
    >
      <div className="overflow-hidden rounded-xl border-2 border-white/20 bg-white/10 p-2 shadow-xl backdrop-blur-sm">
        <div className="relative aspect-[4/3] w-full min-w-[192px] overflow-hidden md:min-w-[220px]">
          <img src={item.url} alt="" className="h-full w-full object-cover" />
          {item.overlayLayout && (hasTitle || hasBody) && (
            <div
              className="pointer-events-none absolute max-w-[94%] px-1"
              style={{
                left: `${item.overlayLayout.xPct}%`,
                top: `${item.overlayLayout.yPct}%`,
                transform: `translate(-50%, -50%) scale(${item.overlayLayout.scale})`,
              }}
            >
              <div
                className={`rounded-md px-1.5 py-1 ${
                  freeTone === "light"
                    ? "text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.92)]"
                    : "text-[#1a1410] [text-shadow:0_1px_2px_rgba(255,255,255,0.45)]"
                } ${
                  freeTone === "light" ? "bg-black/28 backdrop-blur-[1px]" : "bg-white/50 backdrop-blur-[1px]"
                }`}
              >
                {hasTitle && (
                  <p className={`font-courier font-bold ${titleSz}`}>
                    <ViagoRichCourier text={item.photoTitle!} />
                  </p>
                )}
                {hasBody && (
                  <p className={`mt-0.5 font-courier ${bodySz}`}>
                    <ViagoRichCourier text={item.anecdote!} />
                  </p>
                )}
              </div>
            </div>
          )}
          {legacyOverlay && (hasTitle || hasBody) && (
            <div
              className={`absolute left-2 right-2 space-y-1 ${
                pos === "overlay-top" ? "top-2" : "bottom-2"
              }`}
            >
              {hasTitle && (
                <p className={`font-courier ${titleSz} text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]`}>
                  <ViagoRichCourier text={item.photoTitle!} />
                </p>
              )}
              {hasBody && (
                <p className={`font-courier ${bodySz} text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]`}>
                  <ViagoRichCourier text={item.anecdote!} />
                </p>
              )}
            </div>
          )}
        </div>
        {!item.overlayLayout && !legacyOverlay && (hasTitle || hasBody) && (
          <div className="mt-2 space-y-1 px-1">
            {hasTitle && (
              <p
                className={`font-courier ${titleSz} ${
                  isDark ? "text-white/92" : "text-white/80/92"
                }`}
              >
                <ViagoRichCourier text={item.photoTitle!} />
              </p>
            )}
            {hasBody && (
              <p
                className={`font-courier ${bodySz} ${
                  isDark ? "text-white/88" : "text-white/80/90"
                }`}
              >
                <ViagoRichCourier text={item.anecdote!} />
              </p>
            )}
          </div>
        )}
      </div>
      {!readOnly && (
        <div className="absolute -right-2 -top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent-start)] text-white shadow"
            aria-label="Modifier la photo"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow"
            aria-label="Supprimer la photo"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function ViagoSection({
  step,
  voyageId,
  index,
  readOnly = false,
  variant = "dark",
  storageScope = null,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  /** Input fichier global pour l'ajout de photo rapide depuis la galerie (bypass du click dans l'éditeur). */
  const quickAddFileRef = useRef<HTMLInputElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const [content, setContent] = useState<ViagoStepContent | null>(null);
  const [showAddAnecdote, setShowAddAnecdote] = useState(false);
  const [showVisualPhotoEditor, setShowVisualPhotoEditor] = useState(false);
  const [editStepOpen, setEditStepOpen] = useState(false);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);
  const [anecdoteDraft, setAnecdoteDraft] = useState("");
  const [visualInitial, setVisualInitial] = useState<{
    url: string | null;
    title: string;
    anecdote: string;
    overlay: ViagoPhotoOverlayLayout | null;
    layoutBelow: boolean;
    textTone?: "light" | "dark";
    textPosition?: ViagoPhotoTextPosition;
  } | null>(null);
  const [stepTitleDraft, setStepTitleDraft] = useState("");
  const [stepDateDraft, setStepDateDraft] = useState("");
  const [heroDraftUrl, setHeroDraftUrl] = useState("");

  useEffect(() => {
    setContent(getViagoStepContent(voyageId, step.id, storageScope));
    setAnecdoteDraft(step.contenu_voyage?.anecdote ?? "");
  }, [voyageId, step.id, step.contenu_voyage?.anecdote, storageScope]);

  const userAddedPhotos = content?.photos ?? [];
  const anecdote = content?.anecdote ?? step.contenu_voyage?.anecdote ?? "";
  const displayNom = content?.displayTitleOverride?.trim() || step.nom;
  const dateIso = content?.dateOverride || step.date_prevue;
  const displayDate = formatDate(dateIso);
  const heroPreferUrl = content?.heroPhotoUrl?.trim() ? content.heroPhotoUrl.trim() : undefined;

  const openVisualEditorForNew = (withUrl?: string | null) => {
    setEditingPhotoIndex(null);
    setVisualInitial({
      url: withUrl?.trim() || null,
      title: "",
      anecdote: "",
      overlay: null,
      layoutBelow: false,
      textPosition: "overlay-bottom",
    });
    setShowVisualPhotoEditor(true);
  };

  /**
   * Raccourci galerie : ouvre directement le sélecteur de photos du téléphone.
   * Une fois la photo compressée, l'éditeur s'ouvre pré-rempli — l'utilisateur
   * peut immédiatement ajouter un texte par-dessus (bouton « Texte »).
   */
  const triggerQuickAddFromGallery = () => {
    quickAddFileRef.current?.click();
  };

  const openEditPhoto = (idx: number) => {
    const p = userAddedPhotos[idx];
    if (!p) return;
    setEditingPhotoIndex(idx);
    const layoutBelow = Boolean(!p.overlayLayout && p.textPosition === "below");
    const overlay: ViagoPhotoOverlayLayout | null = layoutBelow
      ? null
      : p.overlayLayout ?? defaultOverlayFromPosition(p.textPosition);
    setVisualInitial({
      url: p.url,
      title: p.photoTitle ?? "",
      anecdote: p.anecdote ?? "",
      overlay,
      layoutBelow,
      textTone: p.textTone,
      textPosition: p.textPosition,
    });
    setShowVisualPhotoEditor(true);
  };

  const closeVisualEditor = () => {
    setShowVisualPhotoEditor(false);
    setEditingPhotoIndex(null);
    setVisualInitial(null);
  };

  const handleSaveAnecdote = () => {
    const text = anecdoteDraft.trim();
    saveViagoStepContent(
      voyageId,
      step.id,
      {
        anecdote: text,
        photos: content?.photos ?? [],
        heroPhotoUrl: content?.heroPhotoUrl,
        dateOverride: content?.dateOverride,
        displayTitleOverride: content?.displayTitleOverride,
      },
      storageScope
    );
    setContent(getViagoStepContent(voyageId, step.id, storageScope));
    setShowAddAnecdote(false);
  };

  const handleVisualPhotoConfirm = (item: ViagoPhotoItem) => {
    let newPhotos: ViagoPhotoItem[];
    if (editingPhotoIndex !== null) {
      newPhotos = userAddedPhotos.map((p, i) => (i === editingPhotoIndex ? item : p));
    } else {
      newPhotos = [...userAddedPhotos, item];
    }
    saveViagoStepContent(
      voyageId,
      step.id,
      {
        anecdote: content?.anecdote ?? "",
        photos: newPhotos,
        heroPhotoUrl: content?.heroPhotoUrl,
        dateOverride: content?.dateOverride,
        displayTitleOverride: content?.displayTitleOverride,
      },
      storageScope
    );
    setContent(getViagoStepContent(voyageId, step.id, storageScope));
  };

  const handleRemoveUserPhoto = (idx: number) => {
    const newPhotos = userAddedPhotos.filter((_, i) => i !== idx);
    saveViagoStepContent(
      voyageId,
      step.id,
      {
        anecdote: content?.anecdote ?? "",
        photos: newPhotos,
        heroPhotoUrl: content?.heroPhotoUrl,
        dateOverride: content?.dateOverride,
        displayTitleOverride: content?.displayTitleOverride,
      },
      storageScope
    );
    setContent(getViagoStepContent(voyageId, step.id, storageScope));
  };

  const saveStepMeta = () => {
    saveViagoStepContent(
      voyageId,
      step.id,
      {
        photos: content?.photos ?? [],
        anecdote: content?.anecdote ?? "",
        displayTitleOverride: stepTitleDraft.trim() || null,
        dateOverride: stepDateDraft.trim() || null,
        heroPhotoUrl: heroDraftUrl.trim() || null,
      },
      storageScope
    );
    setContent(getViagoStepContent(voyageId, step.id, storageScope));
    setEditStepOpen(false);
  };

  const openEditStep = () => {
    setStepTitleDraft(content?.displayTitleOverride ?? step.nom);
    setStepDateDraft(content?.dateOverride ?? toInputDate(step.date_prevue));
    setHeroDraftUrl(content?.heroPhotoUrl ?? "");
    setEditStepOpen(true);
  };

  const isDark = variant === "dark";
  return (
    <section id={step.id} ref={ref} className="relative scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-0 flex-col overflow-hidden md:min-h-[min(72vh,640px)] md:flex-row"
      >
        <div
          className={`order-2 flex flex-1 flex-col justify-center px-5 py-10 md:order-1 md:max-w-[55%] md:px-12 md:py-14 ${
            isDark
              ? "bg-gradient-to-b from-[var(--color-bg-secondary)] to-[var(--color-bg-main)]"
              : "bg-[var(--color-bg-secondary)]"
          }`}
        >
          <span className="font-courier text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--color-accent-start)]">
            ÉTAPE {index + 1}
          </span>
          <h2 className="mt-3 font-courier text-4xl font-bold tracking-wider md:text-5xl">
            <Link
              href={`/inspirer/ville/${slugFromNom(step.nom)}?from=viago`}
              className="text-gradient-viago-title-alt transition hover:opacity-90"
            >
              {displayNom}
            </Link>
          </h2>
          <p
            className={`mt-2 font-courier text-sm font-bold md:text-base ${
              isDark ? "text-white/85" : "text-white/80/80"
            }`}
          >
            {displayDate}
          </p>
        </div>

        <div className="relative order-1 min-h-[280px] w-full flex-1 md:order-2 md:min-h-full md:w-[45%]">
          <LieuResolvedBackground
            ville={step.nom}
            stepId={step.id}
            preferUrl={heroPreferUrl}
            className="absolute inset-0"
          />
          <div
            className="absolute inset-0 md:hidden"
            style={{
              background: `linear-gradient(to bottom, color-mix(in srgb, var(--color-bg-main) 22%, transparent), color-mix(in srgb, var(--color-bg-main) 52%, transparent))`,
            }}
          />
          <div
            className="absolute inset-0 hidden md:block"
            style={{
              background: `linear-gradient(to left, transparent, color-mix(in srgb, var(--color-bg-main) 12%, transparent), color-mix(in srgb, var(--color-bg-main) 85%, transparent))`,
            }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-main)] via-transparent to-transparent opacity-90 md:opacity-100"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.15 }}
        className={`viago-glass-card relative z-10 mx-4 -mt-6 p-6 md:mx-auto md:max-w-3xl md:p-10 ${
          isDark ? "viago-glass-card--accent-border" : ""
        }`}
      >
        <input
          ref={heroFileRef}
          type="file"
          accept="image/*,.heic,.heif"
          className="sr-only"
          aria-hidden
          onClick={(e) => {
            (e.currentTarget as HTMLInputElement).value = "";
          }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f?.type.startsWith("image/")) return;
            try {
              const u = await compressImageFileToDataUrl(f);
              setHeroDraftUrl(u);
            } catch {
              /* ignore */
            }
          }}
        />

        {!readOnly && (
          <button
            type="button"
            onClick={() => (editStepOpen ? setEditStepOpen(false) : openEditStep())}
            className="mb-4 w-full rounded-xl border border-dashed border-[var(--color-accent-line-40)] px-3 py-2 text-left font-courier text-xs font-bold text-[var(--color-accent-start)] md:text-sm"
          >
            {editStepOpen ? "▼ Fermer l’édition de l’étape" : "▶ Modifier l’étape (titre, date, image colonne…)"}
          </button>
        )}

        {!readOnly && editStepOpen && (
          <div
            className={`mb-6 space-y-3 rounded-xl border p-4 ${
              isDark
                ? "border-[var(--color-accent-line-30)] bg-[var(--color-bg-tertiary)]"
                : "border-[var(--color-accent-line-30)] bg-white"
            }`}
          >
            <label className={`block font-courier text-xs font-bold ${isDark ? "text-white/80" : "text-white/80"}`}>
              Titre affiché
            </label>
            <input
              value={stepTitleDraft}
              onChange={(e) => setStepTitleDraft(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 font-courier text-sm ${
                isDark
                  ? "border-[var(--color-accent-line-30)] bg-[var(--color-bg-secondary)] text-white"
                  : "border-[var(--color-accent-line-30)]"
              }`}
            />
            <label className={`block font-courier text-xs font-bold ${isDark ? "text-white/80" : "text-white/80"}`}>
              Date
            </label>
            <input
              type="date"
              value={stepDateDraft}
              onChange={(e) => setStepDateDraft(e.target.value)}
              className={`w-full max-w-xs rounded-lg border px-3 py-2 font-courier text-sm ${
                isDark
                  ? "border-[var(--color-accent-line-30)] bg-[var(--color-bg-secondary)] text-white"
                  : "border-[var(--color-accent-line-30)]"
              }`}
            />
            <p className={`font-courier text-[10px] ${isDark ? "text-white/45" : "text-white/80/55"}`}>
              Image grande (colonne droite) : remplace la photo lieu si tu en choisis une.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => heroFileRef.current?.click()}
                className="rounded-lg bg-[var(--color-accent-start)] px-3 py-2 font-courier text-xs font-bold text-white"
              >
                Choisir une image
              </button>
              <button
                type="button"
                onClick={() => setHeroDraftUrl("")}
                className="rounded-lg border px-3 py-2 font-courier text-xs"
              >
                Revenir à la photo lieu
              </button>
            </div>
            {heroDraftUrl ? (
              <img src={heroDraftUrl} alt="" className="mt-2 max-h-40 rounded-lg object-contain" />
            ) : null}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={saveStepMeta}
                className="rounded-lg bg-[var(--color-accent-start)] px-4 py-2 font-courier text-sm font-bold text-white"
              >
                Enregistrer l’étape
              </button>
              <button
                type="button"
                onClick={() => setEditStepOpen(false)}
                className="rounded-lg border px-4 py-2 font-courier text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {userAddedPhotos.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-4">
            {userAddedPhotos.map((item, i) => (
              <PhotoPolaroid
                key={`${item.url.slice(0, 36)}-${i}`}
                item={item}
                i={i}
                isInView={isInView}
                isDark={isDark}
                readOnly={readOnly}
                onRemove={() => handleRemoveUserPhoto(i)}
                onEdit={() => openEditPhoto(i)}
              />
            ))}
          </div>
        )}

        {!readOnly && (
          <div className="mb-6 flex flex-wrap gap-2">
            <input
              ref={quickAddFileRef}
              type="file"
              accept="image/*,.heic,.heif"
              className="sr-only"
              aria-hidden
              onClick={(e) => {
                (e.currentTarget as HTMLInputElement).value = "";
              }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f?.type.startsWith("image/")) return;
                try {
                  const dataUrl = await compressImageFileToDataUrl(f);
                  openVisualEditorForNew(dataUrl);
                } catch {
                  /* ignore */
                } finally {
                  /** Reset pour pouvoir re-uploader la même photo plus tard. */
                  if (quickAddFileRef.current) quickAddFileRef.current.value = "";
                }
              }}
            />
            <button
              type="button"
              onClick={triggerQuickAddFromGallery}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-courier text-sm font-bold text-white shadow-lg transition hover:scale-[1.02] hover:brightness-105"
              style={{ background: "var(--gradient-cta)" }}
            >
              <Image className="h-4 w-4" />
              Photo depuis la galerie
            </button>
            <button
              type="button"
              onClick={() => openVisualEditorForNew()}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent-line-50)] bg-white/5 px-5 py-2.5 font-courier text-sm font-bold text-[var(--color-accent-start)] transition hover:scale-[1.02] hover:bg-white/10"
            >
              <Image className="h-4 w-4" />
              Éditeur avancé
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddAnecdote(true);
                setAnecdoteDraft(anecdote);
              }}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-accent-line-50)] bg-white px-5 py-2.5 font-courier text-sm font-bold text-[var(--color-accent-start)] shadow-sm transition hover:scale-[1.02] hover:border-[var(--color-accent-start)] hover:bg-[var(--color-bg-secondary)]"
            >
              <FileText className="h-4 w-4" />
              {anecdote ? "Modifier l'anecdote" : "Ajouter une anecdote"}
            </button>
          </div>
        )}

        {!readOnly && showAddAnecdote && (
          <div
            className={`mb-6 rounded-xl border p-4 ${
              isDark
                ? "border-[var(--color-accent-line-30)] bg-[var(--color-bg-tertiary)]"
                : "border-[var(--color-accent-line-30)] bg-white"
            }`}
          >
            <p className={`mb-2 font-courier text-sm font-bold ${isDark ? "text-white/90" : "text-white/80"}`}>
              Anecdote d’étape (**gras** possible)
            </p>
            <textarea
              value={anecdoteDraft}
              onChange={(e) => setAnecdoteDraft(e.target.value)}
              placeholder="Ce qui s'est passé…"
              rows={4}
              className={`mb-3 w-full rounded-lg border p-3 font-courier text-sm ${
                isDark
                  ? "border-[var(--color-accent-line-30)] bg-[var(--color-bg-secondary)] text-white placeholder-white/50"
                  : "border-[var(--color-accent-line-30)]"
              }`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveAnecdote}
                className="rounded-lg bg-[var(--color-accent-start)] px-4 py-2 text-sm font-medium text-white"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddAnecdote(false);
                  setAnecdoteDraft(anecdote);
                }}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {anecdote && !showAddAnecdote && (
          <div
            className={`rounded-xl border-l-4 border-[var(--color-accent-start)] p-4 font-courier italic ${
              isDark ? "bg-white/5 text-white/90" : "bg-white/60 text-white/80/90"
            }`}
          >
            <ViagoRichCourier text={anecdote} />
          </div>
        )}

        {step.description_culture && (
          <p
            className={`mt-6 font-courier leading-relaxed ${isDark ? "text-white/80" : "text-white/80/80"}`}
          >
            {step.description_culture}
          </p>
        )}
      </motion.div>

      {showVisualPhotoEditor && visualInitial && (
        <ViagoVisualPhotoEditor
          open={showVisualPhotoEditor}
          onClose={closeVisualEditor}
          onConfirm={handleVisualPhotoConfirm}
          initialUrl={visualInitial.url}
          initialTitle={visualInitial.title}
          initialAnecdote={visualInitial.anecdote}
          initialOverlay={visualInitial.overlay}
          initialLayoutBelow={visualInitial.layoutBelow}
          initialTextTone={visualInitial.textTone}
          initialTextPosition={visualInitial.textPosition}
        />
      )}

      <div className="h-16" />
    </section>
  );
}
