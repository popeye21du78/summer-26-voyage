"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut, UserCog, Compass } from "lucide-react";
import { BRAND_LOGO_FILTER } from "@/lib/brandLogoStyle";

const LOGO_SRC = "/A1.png";
const LOGO_FALLBACK = "/logo-b-voyage-voyage.png";

/** Filtres pour le logo PNG historique (fallback uniquement). */
const LOGO_FILTERS: Record<string, string> = {
  hero: "brightness(0) saturate(100%) invert(70%) sepia(60%) saturate(400%) hue-rotate(340deg) brightness(105%)",
  "on-repart": "brightness(0) saturate(100%) invert(55%) sepia(75%) saturate(700%) hue-rotate(340deg) brightness(105%)",
  philosophie: "brightness(0) saturate(100%) invert(75%) sepia(50%) saturate(500%) hue-rotate(350deg) brightness(110%)",
  social: "brightness(0) saturate(100%) invert(65%) sepia(65%) saturate(600%) hue-rotate(345deg) brightness(108%)",
  default: "brightness(0) saturate(100%) invert(60%) sepia(70%) saturate(650%) hue-rotate(342deg) brightness(103%)",
};

/** Sections accueil à fond clair → bandeau crème + liens foncés. */
const ACCUEIL_LIGHT_SECTIONS = new Set([
  "hero",
  "inspiration",
  "partages",
  "stats",
]);

/** Ancres page accueil — menu « toutes les sections ». */
const ACCUEIL_SECTION_MENU: { id: string; href: string; label: string }[] = [
  { id: "hero", href: "/accueil#hero-section", label: "Introduction" },
  { id: "on-repart", href: "/accueil#on-repart", label: "Par où commencer" },
  { id: "inspiration", href: "/accueil#inspiration-section", label: "Des idées pour partir" },
  { id: "mes-voyages", href: "/accueil#section-mes-voyages", label: "Mes voyages" },
  { id: "partages", href: "/accueil#section-partages", label: "Voyages partagés" },
  { id: "social", href: "/accueil#section-amis", label: "Voyages des amis" },
  { id: "stats", href: "/accueil#section-stats", label: "Ton espace" },
  { id: "createur", href: "/accueil#section-createur", label: "Mot du créateur" },
  { id: "philosophie", href: "/accueil#philosophie-section", label: "Notre regard" },
];

function accueilSectionElements(): { id: string; el: HTMLElement | null }[] {
  return [
    { id: "hero", el: document.getElementById("hero-section") },
    { id: "on-repart", el: document.getElementById("on-repart") },
    { id: "inspiration", el: document.getElementById("inspiration-section") },
    { id: "mes-voyages", el: document.getElementById("section-mes-voyages") },
    { id: "partages", el: document.getElementById("section-partages") },
    { id: "social", el: document.getElementById("section-amis") },
    { id: "stats", el: document.getElementById("section-stats") },
    { id: "createur", el: document.getElementById("section-createur") },
    { id: "philosophie", el: document.getElementById("philosophie-section") },
  ];
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [voyageEnCours, setVoyageEnCours] = useState<{ id: string; titre: string } | null>(null);
  const [currentSection, setCurrentSection] = useState("default");
  const [logoError, setLogoError] = useState(false);
  const [compactNav, setCompactNav] = useState(false);
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
    if (typeof window === "undefined") return;

    function getScrollTop(): number {
      if (window.scrollY > 0) return window.scrollY;
      const doc = document.documentElement;
      if (doc.scrollTop > 0) return doc.scrollTop;
      for (const el of document.querySelectorAll("main")) {
        if (el.scrollTop > 0) return el.scrollTop;
      }
      return 0;
    }

    const update = () => setCompactNav(getScrollTop() > 24);

    const cleanups: Array<() => void> = [];
    function bindScrollTargets() {
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
      const onScroll = () => update();
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => window.removeEventListener("scroll", onScroll));
      document.querySelectorAll("main").forEach((el) => {
        el.addEventListener("scroll", onScroll, { passive: true });
        cleanups.push(() => el.removeEventListener("scroll", onScroll));
      });
      update();
    }

    bindScrollTargets();
    const t0 = requestAnimationFrame(bindScrollTargets);
    const t1 = window.setTimeout(bindScrollTargets, 100);
    const t2 = window.setTimeout(bindScrollTargets, 400);

    return () => {
      cancelAnimationFrame(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      cleanups.forEach((fn) => fn());
    };
  }, [pathname]);

  /** Section accueil (scroll dans <main>, pas window). */
  useEffect(() => {
    const updateSection = () => {
      const sections = accueilSectionElements();
      const threshold = window.innerHeight * 0.42;
      let found = "default";
      for (let i = sections.length - 1; i >= 0; i--) {
        const s = sections[i];
        if (s.el) {
          const rect = s.el.getBoundingClientRect();
          if (rect.top <= threshold) {
            found = s.id;
            break;
          }
        }
      }
      setCurrentSection(found);
    };

    if (pathname !== "/accueil") {
      window.addEventListener("scroll", updateSection, { passive: true });
      updateSection();
      return () => window.removeEventListener("scroll", updateSection);
    }

    const main = document.querySelector("main");
    const scrollEl: EventTarget = main ?? window;
    scrollEl.addEventListener("scroll", updateSection, { passive: true });
    window.addEventListener("scroll", updateSection, { passive: true });
    const t = window.setTimeout(updateSection, 80);
    updateSection();
    return () => {
      window.clearTimeout(t);
      scrollEl.removeEventListener("scroll", updateSection);
      window.removeEventListener("scroll", updateSection);
    };
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
  const accueilLightBand =
    pathname === "/accueil" && ACCUEIL_LIGHT_SECTIONS.has(currentSection);
  /** A1 : variations type titre dégradé (identité marque). Fallback : ancien filtre. */
  const logoStyle = logoError
    ? { filter: logoFilter }
    : { filter: BRAND_LOGO_FILTER[currentSection] ?? BRAND_LOGO_FILTER.default };

  /** Carte inspiration : plein écran sans logo ni menu (contrôles dans l’écran carte). */
  if (pathname?.startsWith("/planifier/inspiration")) {
    return null;
  }

  /** Sur mobile, le bandeau compact masquait toute la nav : on garde les liens visibles sur les écrans voyage / quiz */
  const keepNavVisibleOnMobile =
    pathname?.includes("/voyage/nouveau") ||
    pathname?.includes("/prevu") ||
    pathname?.includes("/ville/") ||
    pathname?.startsWith("/planifier");

  /** Prévu + créer un voyage : pas de bandeau — logo + menu seulement (liens dans le menu) */
  const minimalChrome =
    pathname != null &&
    (/\/voyage\/[^/]+\/prevu/.test(pathname) || pathname === "/voyage/nouveau");

  /** Toujours transparent — ne pas masquer les titres des sections en dessous. */
  const headerChromeClass = minimalChrome
    ? "border-transparent bg-transparent py-1.5 shadow-none backdrop-blur-none"
    : "border-transparent bg-transparent py-1.5 shadow-none backdrop-blur-none md:py-2";

  const onLightChrome = minimalChrome;
  const navOnLight = pathname === "/accueil" && accueilLightBand;

  const navMuted =
    navOnLight
      ? "text-[#4a3328]/95 drop-shadow-[0_1px_6px_rgba(255,251,247,0.95)] hover:text-[#8b3d32]"
      : "text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)] hover:text-white";
  const navActive = navOnLight
    ? "text-[#8b3d32] drop-shadow-[0_1px_6px_rgba(255,251,247,0.9)]"
    : "text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]";

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-[100] overflow-visible px-2 transition-all duration-300 sm:px-3 md:px-4 ${headerChromeClass}`}
    >
      <div className="flex items-center justify-between">
        <Link
          href="/accueil"
          className={`flex items-center transition-opacity hover:opacity-95 ${
            compactNav || minimalChrome ? "drop-shadow-md md:drop-shadow-md" : ""
          }`}
        >
          <div
            className={`relative overflow-visible transition-all duration-300 ${
              compactNav || minimalChrome
                ? "mt-0 h-10 w-[7.75rem] sm:h-11 sm:w-[9rem] md:h-12 md:w-[10.25rem]"
                : "-mt-3 h-[4.75rem] w-[11.5rem] md:-mt-4 md:h-[5.25rem] md:w-[13.5rem]"
            }`}
          >
            <Image
              src={logoError ? LOGO_FALLBACK : LOGO_SRC}
              alt="Viago"
              onError={() => setLogoError(true)}
              fill
              className="object-contain object-left transition-all duration-500"
              style={logoStyle}
              priority
            />
          </div>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Navigation">
          <div
            className={`flex items-center gap-2 transition-all duration-300 sm:gap-4 ${
              minimalChrome
                ? "hidden"
                : compactNav && !keepNavVisibleOnMobile
                  ? "hidden md:flex"
                  : "flex"
            }`}
          >
            <Link
              href="/accueil"
              className={`font-courier text-xs font-bold tracking-wider transition-colors sm:text-sm ${pathname === "/accueil" ? navActive : navMuted}`}
            >
              Accueil
            </Link>
            <Link
              href="/mes-voyages"
              className={`font-courier text-xs font-bold tracking-wider transition-colors sm:text-sm ${pathname?.startsWith("/mes-voyages") ? navActive : navMuted}`}
            >
              Mes voyages
            </Link>
            <Link
              href="/prevoyages"
              className={`hidden font-courier text-xs font-bold tracking-wider transition-colors sm:inline sm:text-sm ${pathname?.startsWith("/prevoyages") ? navActive : navMuted}`}
            >
              Pré-voyages
            </Link>
            {voyageEnCours && !pathname.includes(`/voyage/${voyageEnCours.id}/en-cours`) && (
              <Link
                href={`/voyage/${voyageEnCours.id}/en-cours`}
                className={`hidden items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-sm transition-all duration-300 hover:scale-105 sm:flex ${
                  navOnLight
                    ? "bg-[#E07856]/18 text-[#5c3d2e] hover:bg-[#E07856]/28"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                Revenir au voyage
              </Link>
            )}
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className={`flex items-center gap-1 rounded-full p-1.5 transition-all duration-300 hover:scale-105 ${
                onLightChrome || navOnLight
                  ? "text-[#3d2818] drop-shadow-sm hover:bg-black/10"
                  : compactNav
                    ? "text-[#4a3020] drop-shadow-sm hover:bg-black/5 md:text-white/90 md:hover:bg-white/20"
                    : "text-white/90 hover:bg-white/20 hover:text-white"
              }`}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full z-[110] mt-1 max-h-[min(78vh,520px)] min-w-[min(calc(100vw-1rem),280px)] overflow-y-auto overscroll-contain rounded-xl border border-[#E07856]/30 bg-white/97 py-2 shadow-xl backdrop-blur-md"
                role="menu"
              >
                <p className="px-4 pb-1 pt-1 font-courier text-[10px] font-bold uppercase tracking-[0.2em] text-[#888888]">
                  Sections de l’accueil
                </p>
                {ACCUEIL_SECTION_MENU.map((item) => {
                  const active =
                    pathname === "/accueil" && currentSection === item.id;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      prefetch={false}
                      className={`flex items-center gap-2 px-4 py-2 font-courier text-sm transition-all hover:bg-[#E07856]/12 ${
                        active ? "bg-[#E07856]/15 font-bold text-[#8b3d32]" : "text-[#333333]"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <div className="my-2 border-t border-[#E07856]/18" role="separator" />
                <Link
                  href="/prevoyages"
                  role="menuitem"
                  prefetch={false}
                  className={`flex items-center gap-2 px-4 py-2.5 font-courier text-sm transition-all hover:bg-[#E07856]/10 ${
                    pathname?.startsWith("/prevoyages") ? "font-bold text-[#8b3d32]" : "text-[#333333]"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  Pré-voyages
                </Link>
                {voyageEnCours && (
                  <Link
                    href={`/voyage/${voyageEnCours.id}/en-cours`}
                    role="menuitem"
                    prefetch={false}
                    className="flex items-center gap-2 px-4 py-2.5 font-courier text-sm text-[#333333] transition-all hover:bg-[#E07856]/10"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Compass className="h-4 w-4 shrink-0" />
                    Revenir au voyage
                  </Link>
                )}
                <div className="my-2 border-t border-[#E07856]/18" role="separator" />
                <Link
                  href="/planifier/commencer"
                  role="menuitem"
                  prefetch={false}
                  className="flex items-center gap-2 px-4 py-2.5 font-courier text-sm text-[#333333] transition-all hover:bg-[#E07856]/10"
                  onClick={() => setMenuOpen(false)}
                >
                  Créer un voyage
                </Link>
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
