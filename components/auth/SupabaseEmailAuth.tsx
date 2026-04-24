"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Mail } from "lucide-react";

/**
 * Magic link (OTP) : le lien d’e-mail pointe sur `/auth/callback` (vérifier la redirect URL côté Supabase).
 */
export default function SupabaseEmailAuth() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    setMsg(null);
    setErr(null);
    const e = email.trim();
    if (!e.includes("@")) {
      setErr("E-mail invalide");
      setLoading(false);
      return;
    }
    try {
      const s = createSupabaseBrowserClient();
      const { error } = await s.auth.signInWithOtp({
        email: e,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setErr(error.message);
        return;
      }
      setMsg("Regarde ta boîte e-mail : un lien t’y attend pour te connecter.");
    } catch {
      setErr("Impossible d’envoyer l’e-mail. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-3 rounded-2xl border-2 border-[var(--color-accent-start)]/40 bg-white/5 p-5">
      <div className="flex items-center gap-2 text-[var(--color-accent-start)]">
        <Mail className="h-5 w-5" />
        <span className="font-courier text-sm font-bold uppercase tracking-widest">
          Compte (e-mail)
        </span>
      </div>
      <p className="font-courier text-xs text-white/60">
        Pas de mot de passe : tu reçois un lien magique (activer « Email » dans
        l’authentification Supabase).
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          autoComplete="email"
          placeholder="ton@e-mail.com"
          className="min-w-0 flex-1 rounded-xl border border-white/20 bg-black/20 px-3 py-2.5 font-courier text-sm text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-[var(--color-accent-start)]"
        />
        <button
          type="button"
          onClick={send}
          disabled={loading}
          className="shrink-0 rounded-xl bg-[var(--color-accent-start)] px-4 py-2.5 font-courier text-sm font-bold text-white disabled:opacity-50"
        >
          {loading ? "…" : "Envoyer le lien"}
        </button>
      </div>
      {err ? (
        <p className="font-courier text-xs text-red-400" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="font-courier text-xs text-emerald-300" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
