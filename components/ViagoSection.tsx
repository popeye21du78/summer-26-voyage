"use client";

import { useState, useEffect, useRef } from "react";
import { useInView } from "framer-motion";
import { motion } from "framer-motion";
import { Plus, Image, FileText, X } from "lucide-react";
import type { Step } from "../types";
import {
  getViagoStepContent,
  saveViagoStepContent,
  type ViagoStepContent,
} from "../lib/viago-storage";

type Props = {
  step: Step;
  voyageId: string;
  index: number;
  /** Mode lecture seule : pas de boutons ajouter photo/anecdote */
  readOnly?: boolean;
  /** Variante visuelle (alternance dark/light) */
  variant?: "dark" | "light";
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ViagoSection({ step, voyageId, index, readOnly = false, variant = "dark" }: Props) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const [content, setContent] = useState<ViagoStepContent | null>(null);
  const [showAddAnecdote, setShowAddAnecdote] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [anecdoteDraft, setAnecdoteDraft] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    setContent(getViagoStepContent(voyageId, step.id));
    setAnecdoteDraft(step.contenu_voyage?.anecdote ?? "");
  }, [voyageId, step.id, step.contenu_voyage?.anecdote]);

  const photos = [
    ...(step.contenu_voyage?.photos ?? []),
    ...(content?.photos ?? []),
  ].filter(Boolean);
  const anecdote = content?.anecdote ?? step.contenu_voyage?.anecdote ?? "";

  const handleSaveAnecdote = () => {
    const text = anecdoteDraft.trim();
    saveViagoStepContent(voyageId, step.id, {
      anecdote: text,
      photos: content?.photos ?? [],
    });
    setContent(getViagoStepContent(voyageId, step.id));
    setShowAddAnecdote(false);
  };

  const handleAddPhoto = () => {
    const url = photoUrl.trim();
    if (!url) return;
    const newPhotos = [...(content?.photos ?? []), url];
    saveViagoStepContent(voyageId, step.id, {
      anecdote: content?.anecdote ?? "",
      photos: newPhotos,
    });
    setContent(getViagoStepContent(voyageId, step.id));
    setPhotoUrl("");
    setShowAddPhoto(false);
  };

  const basePhotoCount = step.contenu_voyage?.photos?.length ?? 0;
  const handleRemovePhoto = (idx: number) => {
    if (idx < basePhotoCount) return; // ne pas supprimer les photos de base
    const customPhotos = content?.photos ?? [];
    const newPhotos = customPhotos.filter((_, i) => i !== idx - basePhotoCount);
    saveViagoStepContent(voyageId, step.id, {
      anecdote: content?.anecdote ?? "",
      photos: newPhotos,
    });
    setContent(getViagoStepContent(voyageId, step.id));
  };

  const isDark = variant === "dark";

  return (
    <section
      id={step.id}
      ref={ref}
      className="relative scroll-mt-20"
    >
      {/* Hero : full-width, style site voiture */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <div
          className="aspect-[21/9] min-h-[320px] bg-cover bg-center md:min-h-[400px]"
          style={{
            backgroundImage: photos[0]
              ? `url(${photos[0]})`
              : "linear-gradient(135deg, #5D3A1A 0%, #8B4513 50%, #A0522D 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/30 to-transparent" />
        <div className="absolute inset-0 bg-[#E07856]/15" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <span className="font-courier text-xs font-bold uppercase tracking-[0.3em] text-[#E07856]">
            ÉTAPE {index + 1}
          </span>
          <h2 className="mt-2 font-courier text-4xl font-bold tracking-wider text-white drop-shadow-2xl md:text-6xl">
            {step.nom}
          </h2>
          <p className="mt-2 font-courier text-sm font-bold text-white/90">
            {formatDate(step.date_prevue)}
          </p>
        </div>
      </motion.div>

      {/* Zone contenu éditable */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`relative -mt-12 mx-4 rounded-2xl border p-6 shadow-2xl md:mx-auto md:max-w-3xl md:p-10 ${
          isDark
            ? "border-[#E07856]/30 bg-[#1a1a1a]"
            : "border-[#A55734]/20 bg-[#FAF4F0]"
        }`}
      >
        {/* Galerie photos — style polaroid décalé */}
        {photos.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-4">
            {photos.map((src, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, rotate: -2 }}
                animate={isInView ? { opacity: 1, rotate: i % 2 === 0 ? -1 : 1 } : {}}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="group relative"
                style={{
                  transform: `rotate(${i % 2 === 0 ? "-1.5deg" : "1.5deg"})`,
                }}
              >
                <div className="overflow-hidden rounded-xl border-2 border-white/20 bg-white/10 p-2 shadow-xl backdrop-blur-sm">
                  <div className="aspect-[4/3] w-48 overflow-hidden md:w-56">
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                {!readOnly && i >= basePhotoCount && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Supprimer la photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Boutons ajout rapide — masqués en mode lecture seule */}
        {!readOnly && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowAddPhoto(true)}
              className="btn-terracotta inline-flex items-center gap-2 rounded-full border-2 border-dashed border-[#A55734]/50 bg-white px-4 py-2 font-courier text-sm font-bold text-[#A55734] transition-all duration-300 hover:scale-105 hover:border-[#A55734] hover:bg-[#FFF2EB]/50"
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
              className="btn-terracotta inline-flex items-center gap-2 rounded-full border-2 border-dashed border-[#A55734]/50 bg-white px-4 py-2 font-courier text-sm font-bold text-[#A55734] transition-all duration-300 hover:scale-105 hover:border-[#A55734] hover:bg-[#FFF2EB]/50"
            >
              <FileText className="h-4 w-4" />
              {anecdote ? "Modifier l'anecdote" : "Ajouter une anecdote"}
            </button>
          </div>
        )}

        {!readOnly && showAddPhoto && (
          <div className={`mb-6 rounded-xl border p-4 ${
            isDark ? "border-[#E07856]/30 bg-[#252525]" : "border-[#A55734]/30 bg-white"
          }`}>
            <p className={`mb-2 font-courier text-sm font-bold ${isDark ? "text-white/90" : "text-[#333333]"}`}>
              Coller l&apos;URL d&apos;une photo
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className={`flex-1 rounded-lg border px-3 py-2 font-courier text-sm ${
                  isDark ? "border-[#E07856]/30 bg-[#1a1a1a] text-white placeholder-white/50" : "border-[#A55734]/30"
                }`}
              />
              <button
                type="button"
                onClick={handleAddPhoto}
                className="rounded-lg bg-[#A55734] px-4 py-2 text-sm font-medium text-white"
              >
                Ajouter
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddPhoto(false);
                  setPhotoUrl("");
                }}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {!readOnly && showAddAnecdote && (
          <div className={`mb-6 rounded-xl border p-4 ${
            isDark ? "border-[#E07856]/30 bg-[#252525]" : "border-[#A55734]/30 bg-white"
          }`}>
            <p className={`mb-2 font-courier text-sm font-bold ${isDark ? "text-white/90" : "text-[#333333]"}`}>
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

        {/* Anecdote affichée */}
        {anecdote && !showAddAnecdote && (
          <div className={`rounded-xl border-l-4 border-[#E07856] p-4 font-courier italic ${
            isDark ? "bg-white/5 text-white/90" : "bg-white/60 text-[#333333]/90"
          }`}>
            {anecdote}
          </div>
        )}

        {/* Description culture (lecture seule) */}
        {step.description_culture && (
          <p className={`mt-6 font-courier leading-relaxed ${
            isDark ? "text-white/80" : "text-[#333333]/80"
          }`}>
            {step.description_culture}
          </p>
        )}
      </motion.div>

      <div className="h-16" />
    </section>
  );
}
