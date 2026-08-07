"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { setLangCookie, type Lang } from "@/lib/i18n";

// The language is resolved on the server from the cookie and handed down as a
// prop, so the first HTML the browser receives is already in the right
// language. That removes the English → Indonesian flash and the hydration
// mismatch that came from reading document.cookie during the first render.
const LangContext = createContext<{ lang: Lang; setLang: (next: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

export function LangProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangCookie(next);
    setLangState(next);
    if (typeof document !== "undefined") document.documentElement.lang = next;
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext).lang;
}

export function useSetLang(): (next: Lang) => void {
  return useContext(LangContext).setLang;
}
