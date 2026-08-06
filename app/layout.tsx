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
  title: "Involoop — Invoices That Bring Your Next User",
  description:
    "Create public invoices, accept payments, and earn publishing credits when another B2B professional joins through your invoice.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://involoop.vercel.app"),
  openGraph: {
    title: "Involoop — Invoices That Bring Your Next User",
    description:
      "Turn one sentence into a shareable invoice, accept payment, and earn credits when another professional joins.",
    type: "website",
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={fonts}>
      <body>{children}</body>
    </html>
  );
}
