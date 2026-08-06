import Anthropic from "@anthropic-ai/sdk";

const baseURL = process.env.AI_BASE_URL?.replace(/\/v1\/?$/, "");
const anthropic = new Anthropic({
  apiKey: process.env.AI_API_KEY!,
  ...(baseURL ? { baseURL } : {}),
  defaultHeaders: { "user-agent": "involoop/1.0" },
});

export interface ParsedInvoice {
  client_name: string;
  description: string;
  amount: number;
  currency: string; // ISO code: USD, EUR, GBP, SGD, IDR
  due_date: string | null; // ISO date, or null if not mentioned
  cta_message: string;
}

const SYSTEM_PROMPT = `You turn one freelancer sentence into a structured invoice, in Indonesian or English context.
You also write ONE short, warm, context-aware referral line (max 20 words, in the SAME language as the input)
that will be shown to the CLIENT on the payment page, inviting them to try Involoop themselves IF their business
also needs to bill customers. Tailor the line to the type of work described. Never sound like generic ad copy.

Detect the currency from the amount given. "$" means USD, "€" EUR, "£" GBP, "S$" SGD, "Rp"/"IDR"/"juta" means IDR.
Default to IDR when no currency symbol is present.

Respond ONLY with valid JSON, no markdown fences, matching this shape:
{
  "client_name": string,
  "description": string,
  "amount": number,
  "currency": "USD" | "EUR" | "GBP" | "SGD" | "IDR",
  "due_date": string | null,
  "cta_message": string
}`;

export async function parseInvoiceFromText(input: string): Promise<ParsedInvoice> {
  const message = await anthropic.messages.create({
    model: process.env.AI_MODEL ?? "claude-sonnet-5",
    max_tokens: 2000,
    stream: false,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: input }],
  });

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude did not return a text block");
  }

  const cleaned = block.text
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

  const CURRENCIES = ["USD", "EUR", "GBP", "SGD", "IDR"];
  if (!parsed.currency || !CURRENCIES.includes(parsed.currency)) {
    parsed.currency = "IDR";
  }

  return parsed;
}
