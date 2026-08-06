import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});
const fonts = jakarta.variable;

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
