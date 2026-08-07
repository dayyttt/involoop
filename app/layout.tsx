import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});
const fonts = jakarta.variable;

export const metadata: Metadata = {
  title: "Involoop · Invoices That Bring Your Next User",
  description:
    "Create public invoices, accept payments, and earn publishing credits when another B2B professional joins through your invoice.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://involoop.vercel.app"),
  openGraph: {
    title: "Involoop · Invoices That Bring Your Next User",
    description:
      "Turn one sentence into a shareable invoice, accept payment, and earn credits when another professional joins.",
    type: "website",
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve the language on the server so <html lang> is honest and the first
  // paint is already in the reader's language.
  const cookieLang = cookies().get(LANG_COOKIE)?.value;
  const lang: Lang = cookieLang === "id" ? "id" : "en";

  return (
    {/* suppressHydrationWarning: the inline script below adds a class to <html>
        before React hydrates, which is a deliberate mismatch. */}
    <html lang={lang} className={fonts} suppressHydrationWarning>
      <head>
        {/* Marks that scripting is available, before the first paint. Scroll
            reveals hide their content only under this class, so a browser with
            JavaScript blocked gets the whole page rather than blank sections. */}
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
      </head>
      <body>
        <LangProvider initialLang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
