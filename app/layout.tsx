import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import {
  MoodboardProvider,
  MOODBOARD_PRE_HYDRATION_SCRIPT,
} from "@/components/theme/MoodboardProvider";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["300", "400"],
});

export const metadata: Metadata = {
  title: "Van-Life Journal",
  description: "Carnet de voyage et planificateur van-life",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /**
   * `suppressHydrationWarning` est indispensable ici : le script pré-hydratation
   * (`MOODBOARD_PRE_HYDRATION_SCRIPT`) lit `localStorage` pour appliquer la
   * moodboard et la police SAUVEGARDÉES par l'user, AVANT que React n'hydrate.
   * Du coup, les attributs `data-moodboard` / `data-font-preset` peuvent
   * différer entre le HTML SSR (toujours "terracotta"/"classique") et le DOM
   * client (valeurs persistées). C'est un pattern standard (dark mode, i18n…).
   *
   * On rend aussi `data-font-preset="classique"` par défaut côté serveur pour
   * éviter un mismatch sur le cas "nominal" (pas de préférence user).
   */
  return (
    <html
      lang="fr"
      data-moodboard="terracotta"
      data-font-preset="classique"
      suppressHydrationWarning
    >
      <head>
        {/* Fonts : présets Viago — Classique (legacy) + 5 paires éditoriales/display. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo+Narrow:wght@400;500;700&family=Bricolage+Grotesque:wght@400;500;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Courier+Prime:wght@400;700&family=DM+Sans:wght@400;500;700&family=DM+Serif+Display&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Fraunces:ital,wght@0,400;0,600;1,400&family=Geist:wght@400;500;700&family=Homemade+Apple&family=Instrument+Serif:ital,wght@0,400;1,400&family=Inter+Tight:wght@400;500;700&family=Karla:wght@400;500;700&family=Onest:wght@400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Spectral:ital,wght@0,300;0,400;1,300&family=Special+Elite&family=Unbounded:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{ __html: MOODBOARD_PRE_HYDRATION_SCRIPT }}
        />
      </head>
      <body
        className={`${ibmPlexMono.variable} font-mono antialiased`}
      >
        <MoodboardProvider>
          <div className="app-viewport-root min-h-dvh">{children}</div>
        </MoodboardProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
