"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

export default function CreateSuccess() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/mon-espace");
    }, 2500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex h-full flex-col items-center justify-center bg-[var(--color-bg-main)] px-6">
      <CheckCircle className="h-16 w-16 text-[var(--color-accent-start)]" />
      <h1 className="mt-6 text-center font-title text-2xl font-bold text-white">
        Ton voyage est prêt
      </h1>
      <p className="mt-3 text-center font-courier text-sm text-white/40">
        Redirection vers Mon espace…
      </p>
    </main>
  );
}
