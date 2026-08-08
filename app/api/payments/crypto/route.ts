import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createInvoiceRequest, createPlanRequest } from "@/lib/crypto-payment";
import { apiError } from "@/lib/api-lang";

export const dynamic = "force-dynamic";

// Cents, the same unit the PayPal path uses. Expressing prices one way
// everywhere is what stops a decimals mistake from being invented twice.
const PLAN_PRICE_USD_MINOR: Record<string, number> = { starter: 300, pro: 800 };

// One route, two directions. They are separated here rather than merged,
// because paying an invoice needs no account at all and buying a plan needs
// one — and conflating those would be how an anonymous request ends up
// granting somebody a plan.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const lang = body.lang;

  if (body.purpose === "plan") {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: apiError(lang, "You are not signed in.", "Kamu belum login.") },
        { status: 401 }
      );
    }
    const plan = body.plan === "pro" ? "pro" : body.plan === "starter" ? "starter" : null;
    if (!plan) {
      return NextResponse.json(
        { error: apiError(lang, "Unknown plan.", "Paket tidak dikenal.") },
        { status: 400 }
      );
    }
    const result = await createPlanRequest(user.id, plan, PLAN_PRICE_USD_MINOR[plan]);
    return respond(result, lang);
  }

  // Direction A. Deliberately open: the person paying an invoice is a client
  // who will never have an Involoop account, and requiring one would defeat
  // the point of a public invoice.
  if (typeof body.public_id !== "string" || !body.public_id) {
    return NextResponse.json({ error: "public_id is required" }, { status: 400 });
  }
  const result = await createInvoiceRequest(body.public_id);
  return respond(result, lang);
}

function respond(
  result: Awaited<ReturnType<typeof createInvoiceRequest>>,
  lang: unknown
): NextResponse {
  if (result.ok) return NextResponse.json(result.request);

  const messages: Record<string, [string, string, number]> = {
    not_configured: ["USDC payment is not enabled here yet.", "Pembayaran USDC belum aktif di sini.", 503],
    platform_wallet_missing: ["USDC payment is not enabled here yet.", "Pembayaran USDC belum aktif di sini.", 503],
    invoice_not_found: ["Invoice not found.", "Invoice tidak ditemukan.", 404],
    already_processed: ["This invoice has already been processed.", "Invoice sudah diproses.", 409],
    sample_invoice: [
      "This is a sample invoice — payment is disabled. Create your own to accept real payments.",
      "Ini invoice contoh — pembayaran dimatikan. Buat invoicemu sendiri untuk menerima pembayaran sungguhan.",
      403,
    ],
    currency_not_usd: [
      "USDC payment is only available for invoices in USD.",
      "Pembayaran USDC baru tersedia untuk invoice dalam USD.",
      409,
    ],
    owner_has_no_wallet: [
      "This sender has not set up crypto payment.",
      "Pengirim invoice ini belum menyiapkan pembayaran crypto.",
      409,
    ],
    could_not_create: ["Could not start the payment. Try again.", "Gagal memulai pembayaran. Coba lagi.", 500],
  };
  const [en, id, status] = messages[result.reason] ?? messages.could_not_create;
  return NextResponse.json({ error: apiError(lang, en, id), reason: result.reason }, { status });
}
