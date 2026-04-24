"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Check } from "lucide-react";

type FriendsJson = {
  me: { id: string; name: string | null };
  accepted: { id: string; displayName: string }[];
  pendingIn: { id: string; displayName: string; fromId: string }[];
  pendingOut: { id: string; displayName: string; toId: string }[];
};

/**
 * Amis (compte e-mail uniquement) : demande par UUID, acceptation.
 */
export default function MonEspaceAmisPage() {
  const [data, setData] = useState<FriendsJson | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toId, setToId] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr(null);
    const r = await fetch("/api/friends", { credentials: "same-origin" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr((j as { error?: string }).error ?? "Impossible de charger");
      setData(null);
      return;
    }
    setData(j as FriendsJson);
  }

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  async function requestFriend() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ toUserId: toId.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr((j as { error?: string }).error ?? "Demande refusée");
        return;
      }
      setToId("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function acceptFrom(fromId: string) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fromUserId: fromId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr((j as { error?: string }).error ?? "Refus");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="font-courier text-white/60">Chargement…</p>
      </div>
    );
  }
  if (err && !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-center font-courier text-sm text-amber-200">{err}</p>
        <p className="max-w-sm text-center font-courier text-xs text-white/50">
          Les amis en ligne requièrent une connexion par e-mail (Supabase) — pas
          le mode démo profil.
        </p>
        <Link
          href="/login"
          className="font-courier text-sm text-[var(--color-accent-start)] underline"
        >
          Aller à la connexion
        </Link>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <Link
        href="/mon-espace"
        className="mb-6 inline-flex items-center gap-2 font-courier text-sm text-[var(--color-accent-start)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Mon espace
      </Link>
      <h1 className="font-courier text-2xl font-bold text-white">Amis</h1>
      <p className="mt-2 font-courier text-xs text-white/55">
        Partage l’id ci-dessus avec un ami. Il le colle ici et envoie une demande
        — tu reçois une attente, puis « Accepter ».
      </p>
      <p className="mt-1 font-courier text-[10px] text-white/40">
        <span className="text-[var(--color-accent-start)]">Ton id :</span>{" "}
        <code className="select-all break-all text-white/80">{data.me.id}</code>
      </p>

      <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-[var(--color-accent-start)]">
          <UserPlus className="h-4 w-4" />
          <span className="font-courier text-xs font-bold uppercase">
            Demander en ami
          </span>
        </div>
        <p className="mt-1 font-courier text-[10px] text-white/50">
          Colle l’UUID reçu par message (même longueur que le tien).
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="min-w-0 flex-1 rounded-lg border border-white/20 bg-black/30 px-3 py-2 font-mono text-xs text-white"
          />
          <button
            type="button"
            disabled={busy}
            onClick={requestFriend}
            className="rounded-lg bg-[var(--color-accent-start)] px-3 py-2 font-courier text-xs font-bold text-white disabled:opacity-50"
          >
            Envoyer
          </button>
        </div>
        {err && data ? (
          <p className="mt-2 font-courier text-xs text-amber-300" role="alert">
            {err}
          </p>
        ) : null}
      </div>

      {data.pendingIn.length > 0 && (
        <div className="mt-6">
          <h2 className="font-courier text-sm font-bold text-white/90">
            Demandes reçues
          </h2>
          <ul className="mt-2 space-y-2">
            {data.pendingIn.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <span className="font-courier text-sm text-white/90">
                  {p.displayName}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => acceptFrom(p.fromId)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-accent-start)] px-2 py-1 font-courier text-xs font-bold text-[var(--color-accent-start)]"
                >
                  <Check className="h-3 w-3" />
                  Accepter
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.pendingOut.length > 0 && (
        <div className="mt-4">
          <h2 className="font-courier text-sm font-bold text-white/70">En attente</h2>
          <ul className="mt-1 font-courier text-xs text-white/50">
            {data.pendingOut.map((p) => (
              <li key={p.id}>
                {p.displayName} — en attente de réponse
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.accepted.length > 0 && (
        <div className="mt-6">
          <h2 className="font-courier text-sm font-bold text-white/90">Amis</h2>
          <ul className="mt-2 space-y-1">
            {data.accepted.map((a) => (
              <li key={a.id} className="font-courier text-sm text-white/85">
                {a.displayName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
