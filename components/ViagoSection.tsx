"use client";

import { useState, useEffect, useRef } from "react";
import { useInView } from "framer-motion";
import { motion } from "framer-motion";
import { Image, FileText, X, ImagePlus } from "lucide-react";
import type { Step } from "../types";
import {
  getViagoStepContent,
  saveViagoStepContent,
  type ViagoPhotoFont,
  type ViagoPhotoItem,
  type ViagoPhotoTextPosition,
  type ViagoStepContent,
} from "../lib/viago-storage";
import { compressImageFileToDataUrl } from "../lib/viago-compress-image";
import { LieuResolvedBackground } from "./LieuResolvedBackground";

type Props = {
  step: Step;
  voyageId: string;
  index: number;
  readOnly?: boolean;
  variant?: "dark" | "light";
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function captionFontClass(font: ViagoPhotoFont | undefined, bold: boolean | undefined) {
  const f =
    font === "motto"
      ? "font-motto"
      : font === "sans"
        ? "font-sans tracking-tight"
        : "font-courier";
  const w = bold ? "font-bold" : "font-normal";
  return `${f} ${w}`;
}

function PhotoPolaroid({
  item,
  i,
  isInView,
  isDark,
  readOnly,
  onRemove,
}: {
  item: ViagoPhotoItem;
  i: number;
  isInView: boolean;
  isDark: boolean;
  readOnly: boolean;
  onRemove: () => void;
}) {
  const pos: ViagoPhotoTextPosition = item.textPosition ?? "below";
  const hasCaption = Boolean(item.anecdote?.trim());
  const overlay = hasCaption && (pos === "overlay-bottom" || pos === "overlay-top");

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
          <img
            src={item.url}
            alt=""
            className="h-full w-full object-cover"
          />
          {overlay && hasCaption && (
            <p
              className={`absolute left-2 right-2 ${
                pos === "overlay-top" ? "top-2" : "bottom-2"
              } ${captionFontClass(item.font, item.bold)} text-[11px] leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] md:text-xs`}
            >
              {item.anecdote}
            </p>
          )}
        </div>
        {hasCaption && pos === "below" && (
          <p
            className={`mt-2 px-1 ${captionFontClass(item.font, item.bold)} text-[11px] leading-snug md:text-xs ${
              isDark ? "text-white/88" : "text-[#333]/90"
            }`}
          >
            {item.anecdote}
          </p>
        )}
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition group-hover:opacity-100"
          aria-label="Supprimer la photo"
        >
          <X className="h-3 w-3" />
        </button>
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
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const [content, setContent] = useState<ViagoStepContent | null>(null);
  const [showAddAnecdote, setShowAddAnecdote] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [anecdoteDraft, setAnecdoteDraft] = useState("");
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [draftAnecdote, setDraftAnecdote] = useState("");
  const [draftFont, setDraftFont] = useState<ViagoPhotoFont>("courier");
  const [draftBold, setDraftBold] = useState(false);
  const [draftPosition, setDraftPosition] = useState<ViagoPhotoTextPosition>("below");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState("");

  useEffect(() => {
    setContent(getViagoStepContent(voyageId, step.id));
    setAnecdoteDraft(step.contenu_voyage?.anecdote ?? "");
  }, [voyageId, step.id, step.contenu_voyage?.anecdote]);

  const userAddedPhotos = content?.photos ?? [];
  const anecdote = content?.anecdote ?? step.contenu_voyage?.anecdote ?? "";
  const last = userAddedPhotos[userAddedPhotos.length - 1];
  const heroPreferUrl = last?.url?.trim() ? last.url : null;

  const resetPhotoDraft = () => {
    setDraftUrl(null);
    setDraftAnecdote("");
    setDraftFont("courier");
    setDraftBold(false);
    setDraftPosition("below");
    setPhotoError(null);
    setFallbackUrl("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const closeAddPhoto = () => {
    setShowAddPhoto(false);
    resetPhotoDraft();
  };

  const handleSaveAnecdote = () => {
    const text = anecdoteDraft.trim();
    saveViagoStepContent(voyageId, step.id, {
      anecdote: text,
      photos: content?.photos ?? [],
    });
    setContent(getViagoStepContent(voyageId, step.id));
    setShowAddAnecdote(false);
  };

  const handleConfirmPhoto = () => {
    const url = (draftUrl ?? fallbackUrl.trim()).trim();
    if (!url) {
      setPhotoError("Choisis une image ou colle une URL.");
      return;
    }
    const item: ViagoPhotoItem = {
      url,
      anecdote: draftAnecdote.trim() || undefined,
      font: draftFont,
      bold: draftBold,
      textPosition: draftPosition,
    };
    const newPhotos = [...(content?.photos ?? []), item];
    saveViagoStepContent(voyageId, step.id, {
      anecdote: content?.anecdote ?? "",
      photos: newPhotos,
    });
    setContent(getViagoStepContent(voyageId, step.id));
    closeAddPhoto();
  };

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      setPhotoError("Fichier image attendu.");
      return;
    }
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setDraftUrl(dataUrl);
    } catch {
      setPhotoError("Impossible de lire cette image. Réessaie avec une autre.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemoveUserPhoto = (idx: number) => {
    const newPhotos = (content?.photos ?? []).filter((_, i) => i !== idx);
    saveViagoStepContent(voyageId, step.id, {
      anecdote: content?.anecdote ?? "",
      photos: newPhotos,
    });
    setContent(getViagoStepContent(voyageId, step.id));
  };

  const isDark = variant === "dark";
  const titleGradientStyle = {
    background: "linear-gradient(to right, #E07856, #D4635B, #CD853F)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  } as const;

  const previewSrc = draftUrl ?? (fallbackUrl.trim() || null);

  return (
    <section
      id={step.id}
      ref={ref}
      className="relative scroll-mt-20"
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-0 flex-col overflow-hidden md:min-h-[min(72vh,640px)] md:flex-row"
      >
        <div
          className={`order-2 flex flex-1 flex-col justify-center px-5 py-10 md:order-1 md:max-w-[55%] md:px-12 md:py-14 ${
            isDark
              ? "bg-gradient-to-b from-[#141414] to-[#0d0d0d]"
              : "bg-gradient-to-b from-[#FFF8F0] via-[#FFFBF7] to-[#FAF4F0]"
          }`}
        >
          <span className="font-courier text-[10px] font-bold uppercase tracking-[0.35em] text-[#E07856]">
            ÉTAPE {index + 1}
          </span>
          <h2
            className="mt-3 font-courier text-4xl font-bold tracking-wider md:text-5xl"
            style={titleGradientStyle}
          >
            {step.nom}
          </h2>
          <p
            className={`mt-2 font-courier text-sm font-bold md:text-base ${
              isDark ? "text-white/85" : "text-[#333]/80"
            }`}
          >
            {formatDate(step.date_prevue)}
          </p>
        </div>

        <div className="relative order-1 min-h-[280px] w-full flex-1 md:order-2 md:min-h-full md:w-[45%]">
          <LieuResolvedBackground
            ville={step.nom}
            stepId={step.id}
            preferUrl={heroPreferUrl}
            className="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/50 md:bg-gradient-to-l md:from-transparent md:via-black/10 md:to-[#0d0d0d]/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent opacity-90 md:opacity-100" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.15 }}
        className={`relative z-10 mx-4 -mt-6 rounded-2xl border p-6 shadow-2xl md:mx-auto md:max-w-3xl md:p-10 ${
          isDark
            ? "border-[#E07856]/35 bg-[#1a1a1a]/95"
            : "border-[#E07856]/25 bg-gradient-to-br from-white to-[#FFF8F0]/90"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-hidden
          onChange={handlePickFile}
        />

        {userAddedPhotos.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-4">
            {userAddedPhotos.map((item, i) => (
              <PhotoPolaroid
                key={`${item.url.slice(0, 40)}-${i}`}
                item={item}
                i={i}
                isInView={isInView}
                isDark={isDark}
                readOnly={readOnly}
                onRemove={() => handleRemoveUserPhoto(i)}
              />
            ))}
          </div>
        )}

        {!readOnly && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddPhoto(true);
                resetPhotoDraft();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E07856] to-[#D4635B] px-5 py-2.5 font-courier text-sm font-bold text-white shadow-lg transition hover:scale-[1.02] hover:shadow-[#E07856]/50"
            >
              <Image className="h-4 w-4" />
              Ajouter une photo
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddAnecdote(true);
                setAnecdoteDraft(anecdote);
              }}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#E07856]/50 bg-white px-5 py-2.5 font-courier text-sm font-bold text-[#A55734] shadow-sm transition hover:scale-[1.02] hover:border-[#E07856] hover:bg-[#FFF8F0]"
            >
              <FileText className="h-4 w-4" />
              {anecdote ? "Modifier l'anecdote" : "Ajouter une anecdote"}
            </button>
          </div>
        )}

        {!readOnly && showAddPhoto && (
          <div
            className={`mb-6 overflow-hidden rounded-xl border ${
              isDark ? "border-[#E07856]/30 bg-[#252525]" : "border-[#A55734]/30 bg-white"
            }`}
          >
            <div className="border-b border-[#A55734]/15 px-4 py-3">
              <p
                className={`font-courier text-sm font-bold ${isDark ? "text-white/90" : "text-[#333]"}`}
              >
                Nouvelle photo
              </p>
              <p className={`mt-1 font-courier text-[11px] ${isDark ? "text-white/55" : "text-[#333]/60"}`}>
                Aperçu dans Viago dès que tu choisis une image — anecdote optionnelle sur la photo.
              </p>
            </div>

            <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start">
              <div
                className={`relative flex min-h-[200px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed ${
                  previewSrc
                    ? "border-[#E07856]/40 bg-black/10"
                    : "border-[#A55734]/35 bg-[#FFF8F0]/40"
                } ${isDark ? "bg-[#1a1a1a]" : ""}`}
              >
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt=""
                    className="max-h-[min(52vh,320px)] w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                    <ImagePlus className={`h-12 w-12 ${isDark ? "text-white/25" : "text-[#A55734]/35"}`} />
                    <p className={`font-courier text-xs ${isDark ? "text-white/55" : "text-[#333]/65"}`}>
                      Emplacement de ta photo
                    </p>
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={() => fileRef.current?.click()}
                      className="rounded-full bg-gradient-to-r from-[#E07856] to-[#D4635B] px-5 py-2.5 font-courier text-xs font-bold text-white shadow disabled:opacity-60"
                    >
                      {photoBusy ? "Traitement…" : "Choisir une image"}
                    </button>
                  </div>
                )}
                {previewSrc && !photoBusy && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="mt-3 font-courier text-[11px] font-bold text-[#E07856] underline"
                  >
                    Changer d&apos;image
                  </button>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <label className={`font-courier text-[11px] font-bold uppercase tracking-wide ${isDark ? "text-white/70" : "text-[#A55734]"}`}>
                  Anecdote sur cette photo
                </label>
                <textarea
                  value={draftAnecdote}
                  onChange={(e) => setDraftAnecdote(e.target.value)}
                  placeholder="Un détail, un souvenir lié à cette image…"
                  rows={3}
                  className={`w-full rounded-lg border p-3 font-courier text-sm ${
                    isDark ? "border-[#E07856]/30 bg-[#1a1a1a] text-white placeholder-white/45" : "border-[#A55734]/30"
                  }`}
                />

                <div className="flex flex-wrap gap-2">
                  <span className={`w-full font-courier text-[10px] font-bold uppercase ${isDark ? "text-white/50" : "text-[#333]/55"}`}>
                    Typo
                  </span>
                  {(
                    [
                      ["courier", "Courier"],
                      ["motto", "Motto"],
                      ["sans", "Sans"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDraftFont(id)}
                      className={`rounded-full border px-3 py-1 font-courier text-[11px] font-bold transition ${
                        draftFont === id
                          ? "border-[#E07856] bg-[#E07856] text-white"
                          : isDark
                            ? "border-white/20 text-white/80"
                            : "border-[#A55734]/30 text-[#333]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDraftBold((b) => !b)}
                    className={`rounded-full border px-3 py-1 font-courier text-[11px] font-bold ${
                      draftBold
                        ? "border-[#E07856] bg-[#E07856] text-white"
                        : isDark
                          ? "border-white/20 text-white/80"
                          : "border-[#A55734]/30 text-[#333]"
                    }`}
                  >
                    Gras
                  </button>
                </div>

                <div>
                  <span className={`font-courier text-[10px] font-bold uppercase ${isDark ? "text-white/50" : "text-[#333]/55"}`}>
                    Texte par rapport à la photo
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {(
                      [
                        ["below", "Sous la photo"],
                        ["overlay-bottom", "Sur l’image (bas)"],
                        ["overlay-top", "Sur l’image (haut)"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setDraftPosition(id)}
                        className={`rounded-full border px-2.5 py-1 font-courier text-[10px] font-bold ${
                          draftPosition === id
                            ? "border-[#E07856] bg-[#E07856] text-white"
                            : isDark
                              ? "border-white/20 text-white/75"
                              : "border-[#A55734]/25 text-[#333]/85"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <details className={`rounded-lg border border-dashed px-3 py-2 ${isDark ? "border-white/15" : "border-[#A55734]/25"}`}>
                  <summary className="cursor-pointer font-courier text-[11px] text-[#E07856]">
                    Coller une URL à la place (optionnel)
                  </summary>
                  <input
                    type="url"
                    value={fallbackUrl}
                    onChange={(e) => {
                      setFallbackUrl(e.target.value);
                      if (e.target.value.trim()) setDraftUrl(null);
                    }}
                    placeholder="https://…"
                    className={`mt-2 w-full rounded-lg border px-3 py-2 font-courier text-xs ${
                      isDark ? "border-[#E07856]/30 bg-[#1a1a1a] text-white" : "border-[#A55734]/30"
                    }`}
                  />
                </details>

                {photoError && (
                  <p className="font-courier text-xs text-red-400">{photoError}</p>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmPhoto}
                    disabled={photoBusy}
                    className="rounded-lg bg-[#A55734] px-4 py-2 font-courier text-sm font-bold text-white disabled:opacity-50"
                  >
                    Enregistrer la photo
                  </button>
                  <button
                    type="button"
                    onClick={closeAddPhoto}
                    className="rounded-lg border px-4 py-2 font-courier text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!readOnly && showAddAnecdote && (
          <div
            className={`mb-6 rounded-xl border p-4 ${
              isDark ? "border-[#E07856]/30 bg-[#252525]" : "border-[#A55734]/30 bg-white"
            }`}
          >
            <p
              className={`mb-2 font-courier text-sm font-bold ${isDark ? "text-white/90" : "text-[#333333]"}`}
            >
              Ton anecdote, ton souvenir
            </p>
            <textarea
              value={anecdoteDraft}
              onChange={(e) => setAnecdoteDraft(e.target.value)}
              placeholder="Ce qui s'est passé, ce qu'on a aimé..."
              rows={4}
              className={`mb-3 w-full rounded-lg border p-3 font-courier text-sm ${
                isDark ? "border-[#E07856]/30 bg-[#1a1a1a] text-white placeholder-white/50" : "border-[#A55734]/30"
              }`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveAnecdote}
                className="rounded-lg bg-[#A55734] px-4 py-2 text-sm font-medium text-white"
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
            className={`rounded-xl border-l-4 border-[#E07856] p-4 font-courier italic ${
              isDark ? "bg-white/5 text-white/90" : "bg-white/60 text-[#333333]/90"
            }`}
          >
            {anecdote}
          </div>
        )}

        {step.description_culture && (
          <p
            className={`mt-6 font-courier leading-relaxed ${
              isDark ? "text-white/80" : "text-[#333333]/80"
            }`}
          >
            {step.description_culture}
          </p>
        )}
      </motion.div>

      <div className="h-16" />
    </section>
  );
}
