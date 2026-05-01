import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, Tiro_Devanagari_Hindi } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const tiro = Tiro_Devanagari_Hindi({
  subsets: ["devanagari"],
  weight: "400",
  variable: "--font-tiro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HGS Console — Himalayan Global School",
  description: "Internal school management for Himalayan Global School.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${inter.variable} ${tiro.variable}`}>
      <body className="bg-cream text-ink font-body antialiased">{children}</body>
    </html>
  );
}
