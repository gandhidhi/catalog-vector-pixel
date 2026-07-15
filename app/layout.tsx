import type { Metadata } from "next";
import {
  IBM_Plex_Sans_JP,
  IBM_Plex_Mono,
  DotGothic16,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const ibmPlexSansJP = IBM_Plex_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-sans-jp",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

// Bパターン（ポップ・レトロ）の見出し用ドットフォント
const dotGothic16 = DotGothic16({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dotgothic16",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Adobe Portfolio Viewer",
  description: "学生課題作品閲覧システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ja"
      className={`${ibmPlexSansJP.variable} ${ibmPlexMono.variable} ${dotGothic16.variable}`}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
