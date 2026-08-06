// Server-side language picker for API error messages.
// Client components send `lang` ("en" | "id") in the JSON body.

export function apiError(lang: unknown, en: string, id: string): string {
  return lang === "id" ? id : en;
}
