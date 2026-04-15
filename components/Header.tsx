"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut, Compass } from "lucide-react";

const LOGO_SRC = "/A1.png";

const ORANGE_FILTER = "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(-15deg) brightness(1.1)";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [voyageEnCours, setVoyageEnCours] = useState<{ id: string; titre: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/voyage-state")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.etat === "voyage_en_cours" && data?.voyageEnCours) {
          setVoyageEnCours({
            id: data.voyageEnCours.id,
            titre: data.voyageEnCours.titre,
          });
        }
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMenuOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
      router.refresh();
    }
  }

  if (pathname?.startsWith("/planifier/inspiration")) {
    return null;
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-[100] px-3 py-2">
      <div className="flex items-center justify-between">
        <Link href="/accueil" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <Image
            src={LOGO_SRC}
            alt="Viago"
            width={28}
            height={28}
            className="h-7 w-auto"
            style={{ filter: ORANGE_FILTER }}
            priority
          />
        </Link>
        <nav className="flex items-center gap-2" aria-label="Navigation">
          {voyageEnCours && !pathname?.includes(`/mon-espace/voyage/${voyageEnCours.id}`) && (
            <Link
              href={`/mon-espace/voyage/${voyageEnCours.id}`}
              className="flex items-center gap-1 rounded-xl bg-[#E07856]/10 px-2.5 py-1 font-courier text-[10px] font-bold text-[#E07856] transition hover:bg-[#E07856]/20"
            >
              <Compass className="h-3 w-3" />
              En route
            </Link>
          )}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center rounded-xl p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white/60"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full z-[110] mt-1 min-w-[200px] overflow-hidden rounded-xl border border-white/8 bg-[#1c1c1c]/95 py-1 shadow-xl backdrop-blur-lg"
                role="menu"
              >
                <Link
                  href="/accueil"
                  role="menuitem"
                  prefetch={false}
                  className={`flex items-center gap-2 px-4 py-2.5 font-courier text-xs transition ${
                    pathname === "/accueil" ? "font-bold text-[#E07856]" : "text-white/60 hover:bg-white/5 hover:text-white/80"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  Accueil
                </Link>
                <Link
                  href="/inspirer"
                  role="menuitem"
                  prefetch={false}
                  className={`flex items-center gap-2 px-4 py-2.5 font-courier text-xs transition ${
                    pathname?.startsWith("/inspirer") ? "font-bold text-[#E07856]" : "text-white/60 hover:bg-white/5 hover:text-white/80"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  S&apos;inspirer
                </Link>
                <Link
                  href="/preparer"
                  role="menuitem"
                  prefetch={false}
                  className={`flex items-center gap-2 px-4 py-2.5 font-courier text-xs transition ${
                    pathname?.startsWith("/preparer") ? "font-bold text-[#E07856]" : "text-white/60 hover:bg-white/5 hover:text-white/80"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  Préparer
                </Link>
                <Link
                  href="/mon-espace"
                  role="menuitem"
                  prefetch={false}
                  className={`flex items-center gap-2 px-4 py-2.5 font-courier text-xs transition ${
                    pathname?.startsWith("/mon-espace") ? "font-bold text-[#E07856]" : "text-white/60 hover:bg-white/5 hover:text-white/80"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  Mon espace
                </Link>
                <div className="my-1 border-t border-white/6" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-4 py-2.5 font-courier text-xs text-white/40 transition hover:bg-white/5 hover:text-white/60"
                  onClick={handleLogout}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
