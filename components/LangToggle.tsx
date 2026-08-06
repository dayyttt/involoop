"use client";

import { getInitialLang, setLangCookie, type Lang } from "@/lib/i18n";

export default function LangToggle() {
  const lang = getInitialLang();

  function toggle() {
    const next: Lang = lang === "en" ? "id" : "en";
    setLangCookie(next);
    window.location.reload();
  }

  return (
    <button type="button" className="lang-switch" onClick={toggle} aria-label="Switch language">
      {lang === "en" ? "ID" : "EN"}
    </button>
  );
}
