"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut, UserCog, Compass } from "lucide-react";

const LOGO_SRC = "/logo-le-vrai-bon.png";
const LOGO_FALLBACK = "/logo-b-voyage-voyage.png";

const LOGO_FILTERS: Record<string, string> = {
  hero: "brightness(0) saturate(100%) invert(70%) sepia(60%) saturate(400%) hue-rotate(340deg) brightness(105%)",
  "on-repart": "brightness(0) saturate(100%) invert(55%) sepia(75%) saturate(700%) hue-rotate(340deg) brightness(105%)",
  philosophie: "brightness(0) saturate(100%) invert(75%) sepia(50%) saturate(500%) hue-rotate(350deg) brightness(110%)",
  social: "brightness(0) saturate(100%) invert(65%) sepia(65%) saturate(600%) hue-rotate(345deg) brightness(108%)",
  default: "brightness(0) saturate(100%) invert(60%) sepia(70%) saturate(650%) hue-rotate(342deg) brightness(103%)",
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [voyageEnCours, setVoyageEnCours] = useState<{ id: string; titre: string } | null>(null);
  const [currentSection, setCurrentSection] = useState("default");
  const [logoError, setLogoError] = useState(false);
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
    const handleScroll = () => {
      const sections = [
        { id: "hero", el: document.getElementById("hero-section") },
        { id: "philosophie", el: document.getElementById("philosophie-section") },
        { id: "on-repart", el: document.getElementById("on-repart") },
        { id: "social", el: document.getElementById("social-section") },
      ];
      let found = "default";
      for (let i = sections.length - 1; i >= 0; i--) {
        const s = sections[i];
        if (s.el) {
          const rect = s.el.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.5) {
            found = s.id;
            break;
          }
        }
      }
      setCurrentSection(found);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
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

  const logoFilter = LOGO_FILTERS[currentSection] ?? LOGO_FILTERS.default;

  return (
    <header className="fixed left-0 right-0 top-0 z-[100] overflow-visible border-b border-white/5 bg-gradient-to-b from-black/25 via-black/10 to-transparent px-4 py-1.5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <Link
          href="/accueil"
          className="flex items-center transition-opacity hover:opacity-90"
        >
          <div className="relative -mt-4 h-14 w-36 overflow-visible md:-mt-5 md:h-16 md:w-44">
            <Image
              src={logoError ? LOGO_FALLBACK : LOGO_SRC}
              alt="Voyage Voyage"
              onError={() => setLogoError(true)}
              fill
              className="object-contain object-left drop-shadow-xl transition-all duration-500"
              style={{ filter: logoFilter }}
              priority
            />
          </div>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4" aria-label="Navigation">
          <Link
            href="/accueil"
            className={`font-courier text-xs font-bold tracking-wider transition-all hover:text-white sm:text-sm ${pathname === "/accueil" ? "text-white" : "text-white/80"}`}
          >
            Accueil
          </Link>
          <Link
            href="/mes-voyages"
            className={`font-courier text-xs font-bold tracking-wider transition-all hover:text-white sm:text-sm ${pathname?.startsWith("/mes-voyages") ? "text-white" : "text-white/80"}`}
          >
            Mes voyages
          </Link>
          <Link
            href="/prevoyages"
            className={`font-courier text-xs font-bold tracking-wider transition-all hover:text-white sm:text-sm ${pathname?.startsWith("/prevoyages") ? "text-white" : "text-white/80"}`}
          >
            Pré-voyages
          </Link>
          {voyageEnCours && !pathname.includes(`/voyage/${voyageEnCours.id}/en-cours`) && (
            <Link
              href={`/voyage/${voyageEnCours.id}/en-cours`}
              className="hidden items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/30 sm:flex"
            >
              <Compass className="h-3.5 w-3.5" />
              Revenir au voyage
            </Link>
          )}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1 rounded-full p-1.5 text-white/90 transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:text-white"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 min-w-[180px] rounded-xl border border-[#E07856]/30 bg-white/95 py-2 shadow-xl backdrop-blur-md"
                role="menu"
              >
                <Link
                  href="/profil"
                  role="menuitem"
                  prefetch={false}
                  className="flex items-center gap-2 px-4 py-2.5 font-courier text-sm text-[#333333] transition-all duration-300 hover:scale-[1.02] hover:bg-[#E07856]/10"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserCog className="h-4 w-4" />
                  Modifier ma perso
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-4 py-2.5 font-courier text-left text-sm text-[#333333] transition-all duration-300 hover:scale-[1.02] hover:bg-[#E07856]/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
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
