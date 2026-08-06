import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const syne = Syne({ subsets: ["latin"], variable: "--font-syne", display: "swap" });
const fonts = `${manrope.variable} ${syne.variable}`;

export const metadata: Metadata = {
  title: "Involoop — Invoicing yang menyebar sendiri",
  description:
    "Setiap tagihan yang kamu kirim membawa jalur referral. Klien yang membuka invoice ikut menagih lewat Involoop.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={fonts}>
      <body>{children}</body>
    </html>
  );
}
