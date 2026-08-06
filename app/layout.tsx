import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Involoop — Invoicing yang menyebar sendiri",
  description:
    "Setiap tagihan yang kamu kirim membawa jalur referral. Klien yang membuka invoice ikut menagih lewat Involoop.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={sora.variable}>
      <body>{children}</body>
    </html>
  );
}
