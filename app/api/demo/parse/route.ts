import { NextRequest, NextResponse } from "next/server";
import { parseInvoiceFromText } from "@/lib/claude";
import { apiError } from "@/lib/api-lang";
import { currencyFromCookie } from "@/lib/currency-region";

// Public, login-free preview of the one-sentence → invoice step. This is the
// product's whole "aha" moment, so it has to be reachable before anyone signs
// up. It never touches the database, never spends a credit, and never
// publishes anything: it only returns parsed fields for display.
//
// Expects: { raw_text: string, lang?: "en" | "id" }
export const dynamic = "force-dynamic";

const MAX_INPUT = 220;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 6;

// Best-effort throttle. Serverless instances are not shared, so this caps the
// obvious abuse (one browser hammering the demo) without pretending to be a
// distributed rate limiter.
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  const { raw_text, lang, today } = await req.json().catch(() => ({ raw_text: null, lang: "en" }));

  if (!raw_text || typeof raw_text !== "string" || !raw_text.trim()) {
    return NextResponse.json(
      { error: apiError(lang, "Write a billing sentence first.", "Tulis kalimat tagihan dulu.") },
      { status: 400 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      {
        error: apiError(
          lang,
          "Demo limit reached. Create a free account to keep going.",
          "Batas demo tercapai. Buat akun gratis untuk lanjut."
        ),
      },
      { status: 429 }
    );
  }

  try {
    const parsed = await parseInvoiceFromText(
      raw_text.slice(0, MAX_INPUT),
      lang === "id" ? "id" : "en",
      today,
      currencyFromCookie(req.headers.get("cookie")) ?? "USD"
    );
    if (!parsed.client_name || !parsed.description || !(parsed.amount > 0)) {
      throw new Error("incomplete parse");
    }
    return NextResponse.json({ parsed });
  } catch (err) {
    console.error("demo parse error", err);
    return NextResponse.json(
      {
        error: apiError(
          lang,
          "Could not read that sentence. Try mentioning who, what, and how much.",
          "Kalimatnya belum terbaca. Sebutkan siapa, jasa apa, dan berapa nominalnya."
        ),
      },
      { status: 502 }
    );
  }
}
