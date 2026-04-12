"use client";

import { useState, useEffect, useRef } from "react";
import { useInView } from "framer-motion";
import { motion } from "framer-motion";
import { Image, FileText, X, ImagePlus, Pencil } from "lucide-react";
import type { Step } from "../types";
import {
  getViagoStepContent,
  saveViagoStepContent,
  type ViagoPhotoItem,
  type ViagoPhotoTextPosition,
  type ViagoStepContent,
  type ViagoTextSize,
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

/** Gras partiel avec **mot** — uniquement Courier. */
function RichCourier({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

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
  const pos: ViagoPhotoTextPosition = item.textPosition ?? "below";
  const titleSz = SIZE_CLASS[item.titleSize ?? "base"];
  const bodySz = SIZE_CLASS[item.bodySize ?? "sm"];
  const hasTitle = Boolean(item.photoTitle?.trim());
  const hasBody = Boolean(item.anecdote?.trim());
  const overlay = (pos === "overlay-bottom" || pos === "overlay-top") && (hasTitle || hasBody);

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
          {overlay && (hasTitle || hasBody) && (
            <div
              className={`absolute left-2 right-2 space-y-1 ${
                pos === "overlay-top" ? "top-2" : "bottom-2"
              }`}
            >
              {hasTitle && (
                <p className={`font-courier ${titleSz} text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]`}>
                  <RichCourier text={item.photoTitle!} />
                </p>
              )}
              {hasBody && (
                <p className={`font-courier ${bodySz} text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]`}>
                  <RichCourier text={item.anecdote!} />
                </p>
              )}
            </div>
          )}
        </div>
        {!overlay && (hasTitle || hasBody) && (
          <div className="mt-2 space-y-1 px-1">
            {hasTitle && (
              <p
                className={`font-courier ${titleSz} ${
                  isDark ? "text-white/92" : "text-[#333]/92"
                }`}
              >
                <RichCourier text={item.photoTitle!} />
              </p>
            )}
            {hasBody && (
              <p
                className={`font-courier ${bodySz} ${
                  isDark ? "text-white/88" : "text-[#333]/90"
                }`}
              >
                <RichCourier text={item.anecdote!} />
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
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#A55734] text-white shadow"
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

const SIZE_OPTIONS: { id: ViagoTextSize; label: string }[] = [
  { id: "xs", label: "XS" },
  { id: "sm", label: "S" },
  { id: "base", label: "M" },
  { id: "lg", label: "L" },
];

export default function ViagoSection({
  step,
  voyageId,
  index,
  readOnly = false,
  variant = "dark",
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const [content, setContent] = useState<ViagoStepContent | null>(null);
  const [showAddAnecdote, setShowAddAnecdote] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [editStepOpen, setEditStepOpen] = useState(false);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);
  const [anecdoteDraft, setAnecdoteDraft] = useState("");
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAnecdote, setDraftAnecdote] = useState("");
  const [draftTitleSize, setDraftTitleSize] = useState<ViagoTextSize>("base");
  const [draftBodySize, setDraftBodySize] = useState<ViagoTextSize>("sm");
  const [draftPosition, setDraftPosition] = useState<ViagoPhotoTextPosition>("below");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [stepTitleDraft, setStepTitleDraft] = useState("");
  const [stepDateDraft, setStepDateDraft] = useState("");
  const [heroDraftUrl, setHeroDraftUrl] = useState("");

  useEffect(() => {
    setContent(getViagoStepContent(voyageId, step.id));
    setAnecdoteDraft(step.contenu_voyage?.anecdote ?? "");
  }, [voyageId, step.id, step.contenu_voyage?.anecdote]);

  const userAddedPhotos = content?.photos ?? [];
  const anecdote = content?.anecdote ?? step.contenu_voyage?.anecdote ?? "";
  const displayNom = content?.displayTitleOverride?.trim() || step.nom;
  const dateIso = content?.dateOverride || step.date_prevue;
  const displayDate = formatDate(dateIso);
  const heroPreferUrl = content?.heroPhotoUrl?.trim() ? content.heroPhotoUrl.trim() : undefined;

  const resetPhotoDraft = () => {
    setDraftUrl(null);
    setDraftTitle("");
    setDraftAnecdote("");
    setDraftTitleSize("base");
    setDraftBodySize("sm");
    setDraftPosition("below");
    setPhotoError(null);
    setFallbackUrl("");
    setEditingPhotoIndex(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openEditPhoto = (idx: number) => {
    const p = userAddedPhotos[idx];
    if (!p) return;
    setEditingPhotoIndex(idx);
    setDraftUrl(p.url);
    setDraftTitle(p.photoTitle ?? "");
    setDraftAnecdote(p.anecdote ?? "");
    setDraftTitleSize(p.titleSize ?? "base");
    setDraftBodySize(p.bodySize ?? "sm");
    setDraftPosition(p.textPosition ?? "below");
    setShowAddPhoto(true);
    setFallbackUrl("");
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
      heroPhotoUrl: content?.heroPhotoUrl,
      dateOverride: content?.dateOverride,
      displayTitleOverride: content?.displayTitleOverride,
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
      photoTitle: draftTitle.trim() || undefined,
      anecdote: draftAnecdote.trim() || undefined,
      titleSize: draftTitleSize,
      bodySize: draftBodySize,
      textPosition: draftPosition,
    };
    let newPhotos: ViagoPhotoItem[];
    if (editingPhotoIndex !== null) {
      newPhotos = userAddedPhotos.map((p, i) => (i === editingPhotoIndex ? item : p));
    } else {
      newPhotos = [...userAddedPhotos, item];
    }
    saveViagoStepContent(voyageId, step.id, {
      anecdote: content?.anecdote ?? "",
      photos: newPhotos,
      heroPhotoUrl: content?.heroPhotoUrl,
      dateOverride: content?.dateOverride,
      displayTitleOverride: content?.displayTitleOverride,
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
    const newPhotos = userAddedPhotos.filter((_, i) => i !== idx);
    saveViagoStepContent(voyageId, step.id, {
      anecdote: content?.anecdote ?? "",
      photos: newPhotos,
      heroPhotoUrl: content?.heroPhotoUrl,
      dateOverride: content?.dateOverride,
      displayTitleOverride: content?.displayTitleOverride,
    });
    setContent(getViagoStepContent(voyageId, step.id));
  };

  const saveStepMeta = () => {
    saveViagoStepContent(voyageId, step.id, {
      photos: content?.photos ?? [],
      anecdote: content?.anecdote ?? "",
      displayTitleOverride: stepTitleDraft.trim() || null,
      dateOverride: stepDateDraft.trim() || null,
      heroPhotoUrl: heroDraftUrl.trim() || null,
    });
    setContent(getViagoStepContent(voyageId, step.id));
    setEditStepOpen(false);
  };

  const openEditStep = () => {
    setStepTitleDraft(content?.displayTitleOverride ?? step.nom);
    setStepDateDraft(content?.dateOverride ?? toInputDate(step.date_prevue));
    setHeroDraftUrl(content?.heroPhotoUrl ?? "");
    setEditStepOpen(true);
  };

  const isDark = variant === "dark";
  const titleGradientStyle = {
    background: "linear-gradient(to right, #E07856, #D4635B, #CD853F)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  } as const;

  const previewSrc = draftUrl ?? (fallbackUrl.trim() || null);
  const previewTitleSz = SIZE_CLASS[draftTitleSize];
  const previewBodySz = SIZE_CLASS[draftBodySize];

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
            {displayNom}
          </h2>
          <p
            className={`mt-2 font-courier text-sm font-bold md:text-base ${
              isDark ? "text-white/85" : "text-[#333]/80"
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
        <input
          ref={heroFileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-hidden
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
            className="mb-4 w-full rounded-xl border border-dashed border-[#E07856]/40 px-3 py-2 text-left font-courier text-xs font-bold text-[#E07856] md:text-sm"
          >
            {editStepOpen ? "▼ Fermer l’édition de l’étape" : "▶ Modifier l’étape (titre, date, image colonne…)"}
          </button>
        )}

        {!readOnly && editStepOpen && (
          <div
            className={`mb-6 space-y-3 rounded-xl border p-4 ${
              isDark ? "border-[#E07856]/30 bg-[#252525]" : "border-[#A55734]/30 bg-white"
            }`}
          >
            <label className={`block font-courier text-xs font-bold ${isDark ? "text-white/80" : "text-[#333]"}`}>
              Titre affiché
            </label>
            <input
              value={stepTitleDraft}
              onChange={(e) => setStepTitleDraft(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 font-courier text-sm ${
                isDark ? "border-[#E07856]/30 bg-[#1a1a1a] text-white" : "border-[#A55734]/30"
              }`}
            />
            <label className={`block font-courier text-xs font-bold ${isDark ? "text-white/80" : "text-[#333]"}`}>
              Date
            </label>
            <input
              type="date"
              value={stepDateDraft}
              onChange={(e) => setStepDateDraft(e.target.value)}
              className={`w-full max-w-xs rounded-lg border px-3 py-2 font-courier text-sm ${
                isDark ? "border-[#E07856]/30 bg-[#1a1a1a] text-white" : "border-[#A55734]/30"
              }`}
            />
            <p className={`font-courier text-[10px] ${isDark ? "text-white/45" : "text-[#333]/55"}`}>
              Image grande (colonne droite) : remplace la photo lieu si tu en choisis une.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => heroFileRef.current?.click()}
                className="rounded-lg bg-[#A55734] px-3 py-2 font-courier text-xs font-bold text-white"
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
                className="rounded-lg bg-[#A55734] px-4 py-2 font-courier text-sm font-bold text-white"
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
            <button
              type="button"
              onClick={() => {
                resetPhotoDraft();
                setShowAddPhoto(true);
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
              <p className={`font-courier text-sm font-bold ${isDark ? "text-white/90" : "text-[#333]"}`}>
                {editingPhotoIndex !== null ? "Modifier la photo" : "Nouvelle photo"}
              </p>
              <p className={`mt-1 font-courier text-[11px] ${isDark ? "text-white/55" : "text-[#333]/60"}`}>
                Aperçu en direct · **gras** avec astérisques · police Courier uniquement.
              </p>
            </div>

            <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start">
              <div
                className={`relative flex min-h-[200px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed ${
                  previewSrc ? "border-[#E07856]/40 bg-black/10" : "border-[#A55734]/35 bg-[#FFF8F0]/40"
                } ${isDark ? "bg-[#1a1a1a]" : ""}`}
              >
                {previewSrc ? (
                  <div className="relative w-full">
                    <img
                      src={previewSrc}
                      alt=""
                      className="max-h-[min(40vh,280px)] w-full rounded-lg object-contain"
                    />
                    {draftPosition !== "below" && (draftTitle.trim() || draftAnecdote.trim()) && (
                      <div
                        className={`absolute left-2 right-2 space-y-1 ${
                          draftPosition === "overlay-top" ? "top-2" : "bottom-2"
                        }`}
                      >
                        {draftTitle.trim() ? (
                          <p className={`font-courier ${previewTitleSz} text-white drop-shadow-md`}>
                            <RichCourier text={draftTitle} />
                          </p>
                        ) : null}
                        {draftAnecdote.trim() ? (
                          <p className={`font-courier ${previewBodySz} text-white drop-shadow-md`}>
                            <RichCourier text={draftAnecdote} />
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                    <ImagePlus className={`h-12 w-12 ${isDark ? "text-white/25" : "text-[#A55734]/35"}`} />
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

              <div className="flex min-w-0 flex-[1.1] flex-col gap-3">
                <label className={`font-courier text-[11px] font-bold ${isDark ? "text-white/70" : "text-[#A55734]"}`}>
                  Titre (taille propre)
                </label>
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Optionnel"
                  className={`w-full rounded-lg border px-3 py-2 font-courier text-sm ${
                    isDark ? "border-[#E07856]/30 bg-[#1a1a1a] text-white" : "border-[#A55734]/30"
                  }`}
                />
                <div className="flex flex-wrap gap-1">
                  {SIZE_OPTIONS.map((o) => (
                    <button
                      key={`t-${o.id}`}
                      type="button"
                      onClick={() => setDraftTitleSize(o.id)}
                      className={`rounded-full border px-2 py-0.5 font-courier text-[10px] font-bold ${
                        draftTitleSize === o.id
                          ? "border-[#E07856] bg-[#E07856] text-white"
                          : isDark
                            ? "border-white/20 text-white/75"
                            : "border-[#A55734]/30 text-[#333]"
                      }`}
                    >
                      Titre {o.label}
                    </button>
                  ))}
                </div>

                <label className={`font-courier text-[11px] font-bold ${isDark ? "text-white/70" : "text-[#A55734]"}`}>
                  Texte / anecdote (**gras**)
                </label>
                <textarea
                  value={draftAnecdote}
                  onChange={(e) => setDraftAnecdote(e.target.value)}
                  placeholder="Texte… Utilise **mot** pour le gras."
                  rows={3}
                  className={`w-full rounded-lg border p-3 font-courier text-sm ${
                    isDark ? "border-[#E07856]/30 bg-[#1a1a1a] text-white placeholder-white/45" : "border-[#A55734]/30"
                  }`}
                />
                <div className="flex flex-wrap gap-1">
                  {SIZE_OPTIONS.map((o) => (
                    <button
                      key={`b-${o.id}`}
                      type="button"
                      onClick={() => setDraftBodySize(o.id)}
                      className={`rounded-full border px-2 py-0.5 font-courier text-[10px] font-bold ${
                        draftBodySize === o.id
                          ? "border-[#E07856] bg-[#E07856] text-white"
                          : isDark
                            ? "border-white/20 text-white/75"
                            : "border-[#A55734]/30 text-[#333]"
                      }`}
                    >
                      Texte {o.label}
                    </button>
                  ))}
                </div>

                {draftPosition === "below" && (draftTitle.trim() || draftAnecdote.trim()) ? (
                  <div
                    className={`rounded-lg border border-dashed p-3 ${
                      isDark ? "border-white/15 bg-black/20" : "border-[#A55734]/20 bg-[#FFF8F0]/50"
                    }`}
                  >
                    <p className={`mb-1 font-courier text-[10px] uppercase ${isDark ? "text-white/45" : "text-[#333]/55"}`}>
                      Aperçu sous la photo
                    </p>
                    {draftTitle.trim() ? (
                      <p className={`font-courier ${previewTitleSz} ${isDark ? "text-white/90" : "text-[#333]/90"}`}>
                        <RichCourier text={draftTitle} />
                      </p>
                    ) : null}
                    {draftAnecdote.trim() ? (
                      <p className={`mt-1 font-courier ${previewBodySz} ${isDark ? "text-white/85" : "text-[#333]/88"}`}>
                        <RichCourier text={draftAnecdote} />
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <span className={`font-courier text-[10px] font-bold uppercase ${isDark ? "text-white/50" : "text-[#333]/55"}`}>
                    Position
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
                    Coller une URL (optionnel)
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

                {photoError && <p className="font-courier text-xs text-red-400">{photoError}</p>}

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmPhoto}
                    disabled={photoBusy}
                    className="rounded-lg bg-[#A55734] px-4 py-2 font-courier text-sm font-bold text-white disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                  <button type="button" onClick={closeAddPhoto} className="rounded-lg border px-4 py-2 font-courier text-sm">
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
            <p className={`mb-2 font-courier text-sm font-bold ${isDark ? "text-white/90" : "text-[#333333]"}`}>
              Anecdote d’étape (**gras** possible)
            </p>
            <textarea
              value={anecdoteDraft}
              onChange={(e) => setAnecdoteDraft(e.target.value)}
              placeholder="Ce qui s'est passé…"
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
            <RichCourier text={anecdote} />
          </div>
        )}

        {step.description_culture && (
          <p
            className={`mt-6 font-courier leading-relaxed ${isDark ? "text-white/80" : "text-[#333333]/80"}`}
          >
            {step.description_culture}
          </p>
        )}
      </motion.div>

      <div className="h-16" />
    </section>
  );
}
