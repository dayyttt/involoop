import Link from "next/link";
import { cookies } from "next/headers";
import { LANG_COOKIE, appText, type Lang } from "@/lib/i18n";
import { legalDocs, LEGAL_UPDATED } from "./legal-content";

// Shared renderer for /privacy and /terms. Server-rendered so the documents are
// readable (and indexable) without JavaScript.
export default function LegalPage({ doc }: { doc: "privacy" | "terms" }) {
  const cookieLang = cookies().get(LANG_COOKIE)?.value;
  const lang: Lang = cookieLang === "id" ? "id" : "en";
  const content = legalDocs[doc][lang];
  const updated = new Date(LEGAL_UPDATED).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>
        <Link href="/" className="btn btn-ghost">
          {appText(lang, "legal.back")}
        </Link>
      </nav>
      <main className="page-shell legal-doc" style={{ maxWidth: 720 }}>
        <h1 className="page-title">{content.title}</h1>
        <p className="hint">
          {appText(lang, "legal.updated")}: {updated}
        </p>
        <p className="legal-intro">{content.intro}</p>
        {content.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </main>
    </>
  );
}
