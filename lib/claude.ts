import { SUPPORTED_CURRENCIES } from "@/lib/money";

const baseURL = (process.env.AI_BASE_URL ?? "").replace(/\/+$/, "");

export interface ParsedInvoice {
  client_name: string;
  description: string;
  amount: number;
  currency: string; // ISO code: USD, EUR, GBP, SGD, IDR
  due_date: string | null; // ISO date, or null if not mentioned
  cta_message: string;
}

function buildSystemPrompt(lang: string, today: string): string {
  const ctaLang = lang === "id" ? "Indonesian" : "English";
  return `Today's date is ${today}. Resolve every relative due date ("in 2 weeks",
"jatuh tempo seminggu", "end of the month") against that date, and never return a
due date in the past. If no due date is mentioned, return null.

You turn one freelancer sentence into a structured invoice, in Indonesian or English context.
You also write ONE short, warm, context-aware referral line (max 20 words, written in ${ctaLang})
that will be shown to the CLIENT on the payment page, inviting them to try Involoop themselves IF their business
also needs to bill customers. Tailor the line to the type of work described. Never sound like generic ad copy.

Detect the currency from the amount given:
  "Rp", "IDR", "juta", "ribu"  -> IDR
  "RM", "ringgit"              -> MYR
  "S$", "SGD"                  -> SGD
  "฿", "baht", "THB"           -> THB
  "₱", "peso", "PHP"           -> PHP
  "$", "USD"                   -> USD
  "€" EUR, "£" GBP
Default to IDR when no currency symbol is present.

Respond ONLY with valid JSON, no markdown fences, matching this shape:
{
  "client_name": string,
  "description": string,
  "amount": number,
  "currency": "IDR" | "MYR" | "SGD" | "THB" | "PHP" | "USD" | "EUR" | "GBP",
  "due_date": string | null,
  "cta_message": string
}`;
}

export async function parseInvoiceFromText(input: string, lang = "en"): Promise<ParsedInvoice> {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL ?? "broday";
  if (!apiKey || !baseURL) {
    throw new Error("AI not configured");
  }

  const today = new Date().toISOString().slice(0, 10);

  const res = await fetch(`${baseURL}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "user-agent": "involoop/1.0",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      stream: false,
      system: buildSystemPrompt(lang, today),
      messages: [{ role: "user", content: input }],
    }),
    signal: AbortSignal.timeout(50000),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`AI HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`AI non-JSON response: ${text.slice(0, 200)}`);
  }

  let raw: string | null = null;
  if (Array.isArray(json?.content)) {
    const block = json.content.find((b: any) => b?.type === "text");
    raw = block?.text ?? null;
  } else if (Array.isArray(json?.choices) && json.choices[0]?.message) {
    raw = json.choices[0].message.content ?? null;
  }
  if (!raw || typeof raw !== "string") {
    throw new Error(`AI response missing text: ${text.slice(0, 200)}`);
  }

  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/```json|```/g, "")
    .trim();

  let parsed: ParsedInvoice | null = null;
  let cursor = 0;
  while (!parsed) {
    const jsonStart = cleaned.indexOf("{", cursor);
    if (jsonStart < 0) break;
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonEnd <= jsonStart) break;
    const candidate = cleaned.slice(jsonStart, jsonEnd + 1);
    try {
      parsed = JSON.parse(candidate);
      break;
    } catch {
      cursor = jsonStart + 1;
    }
  }
  if (!parsed) {
    throw new Error("Failed to parse Claude response as JSON: " + cleaned);
  }

  if (!parsed.client_name || !parsed.description || typeof parsed.amount !== "number") {
    throw new Error("Claude response missing required invoice fields");
  }

  if (!parsed.currency || !(SUPPORTED_CURRENCIES as readonly string[]).includes(parsed.currency)) {
    parsed.currency = "IDR";
  }

  // A model with an older knowledge cutoff can answer "due in two weeks" with a
  // date from a previous year. A due date far in the past is always a parsing
  // error, and a wrong date on an invoice is worse than no date at all.
  if (parsed.due_date) {
    const due = new Date(parsed.due_date);
    const floor = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(due.getTime()) || due < floor) {
      parsed.due_date = null;
    }
  }

  return parsed;
}
