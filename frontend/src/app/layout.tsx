import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Méditerranée 2000 · Interventions scolaires",
  description: "Gestion des interventions scolaires",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header className="app-header">
          <span className="app-header-logo">M2000</span>
          <span className="app-header-title">Interventions scolaires</span>
        </header>
        {children}
      </body>
    </html>
  );
}
