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
  return (
    <html lang="fr" data-moodboard="terracotta">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Courier+Prime:wght@400;700&family=DM+Sans:wght@400;500;700&family=Figtree:wght@400;500;700&family=Homemade+Apple&family=Inter:wght@400;500;700&family=Manrope:wght@500;700&family=Outfit:wght@400;500;700&family=Plus+Jakarta+Sans:wght@500;700&family=Sora:wght@400;600;700&family=Space+Grotesk:wght@500;700&family=Special+Elite&display=swap"
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
