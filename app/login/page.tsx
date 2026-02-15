"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error || "Code incorrect");
        return;
      }
      router.push("/accueil?welcome=1");
      router.refresh();
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF]">
      <div className="w-full max-w-xs space-y-8 px-4">
        <div className="flex justify-center">
          <Lock className="h-12 w-12 text-[#A55734]" aria-hidden />
        </div>
        <h1 className="text-center font-heading text-4xl font-normal text-[#333333]">
          Van-Life Journal
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code d'accès"
            className="w-full rounded-lg border border-[#A55734]/40 bg-white px-4 py-3 text-center text-[#333333] placeholder:text-gray-400 focus:border-[#A55734] focus:outline-none focus:ring-1 focus:ring-[#A55734]"
            autoFocus
            disabled={loading}
          />
          {error && (
            <p className="text-center text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#A55734] px-4 py-3 font-medium text-white transition hover:bg-[#8b4728] disabled:opacity-50"
          >
            {loading ? "Connexion…" : "Accéder"}
          </button>
        </form>
      </div>
    </div>
  );
}
