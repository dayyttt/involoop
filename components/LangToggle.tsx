"use client";

import { useLang, useSetLang } from "@/components/LangProvider";

// Shows the language you would switch TO, and says so out loud for screen
// readers, because a bare "ID" is ambiguous on its own.
export default function LangToggle() {
  const lang = useLang();
  const setLang = useSetLang();
  const next = lang === "en" ? "id" : "en";

  return (
    <button
      type="button"
      className="lang-switch"
      onClick={() => setLang(next)}
      aria-label={next === "id" ? "Ganti ke Bahasa Indonesia" : "Switch to English"}
      title={next === "id" ? "Bahasa Indonesia" : "English"}
      lang={next}
    >
      {next.toUpperCase()}
    </button>
  );
}
