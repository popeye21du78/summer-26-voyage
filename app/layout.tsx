import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

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
    <html lang="fr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Homemade+Apple&family=Special+Elite&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${ibmPlexMono.variable} font-mono antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
