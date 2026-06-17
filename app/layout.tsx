import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adobe Portfolio Viewer",
  description: "学生課題作品閲覧システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
