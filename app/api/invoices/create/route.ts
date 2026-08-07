import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { parseInvoiceFromText } from "@/lib/claude";
import { apiError } from "@/lib/api-lang";
import { currencyFromCookie } from "@/lib/currency-region";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

// Expects: { raw_text: string } or { manual: true, ...fields }, lang?: "en" | "id"
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { raw_text, manual, client_name, description, amount, due_date, cta_message, currency, lang, today } = body;

    let parsed;

    if (manual) {
      if (
        !client_name ||
        !description ||
        typeof amount !== "number" ||
        !(amount > 0)
      ) {
        return NextResponse.json(
          { error: apiError(lang, "Fill in the client name, description, and a valid amount.", "Lengkapi nama klien, deskripsi, dan nominal yang valid.") },
          { status: 400 }
        );
      }
      const cur = typeof currency === "string" ? currency.toUpperCase() : "IDR";
      if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(cur)) {
        return NextResponse.json(
          { error: apiError(lang, "Currency is not supported.", "Currency tidak didukung.") },
          { status: 400 }
        );
      }
      parsed = {
        client_name: String(client_name),
        description: String(description),
        amount,
        currency: cur,
        due_date: due_date || null,
        cta_message: typeof cta_message === "string" ? cta_message : null,
      };
    } else if (!raw_text || typeof raw_text !== "string") {
      return NextResponse.json(
        { error: apiError(lang, "Write your billing sentence first.", "Tulis kalimat tagihan dulu.") },
        { status: 400 }
      );
    } else {
      try {
        parsed = await parseInvoiceFromText(
          raw_text,
          lang === "id" ? "id" : "en",
          today,
          currencyFromCookie(req.headers.get("cookie")) ?? "USD"
        );
      } catch (err: any) {
        console.error("AI parse error", err);
        return NextResponse.json(
          {
            error: apiError(
              lang,
              "AI could not compose the invoice. Try again, or use the manual form below.",
              "AI gagal menyusun invoice. Coba lagi, atau gunakan form manual di bawah."
            ),
          },
          { status: 502 }
        );
      }

      if (!parsed.client_name || !parsed.description || typeof parsed.amount !== "number" || parsed.amount <= 0) {
        return NextResponse.json(
          { error: apiError(lang, "AI result is invalid. Try writing your sentence again.", "Hasil AI tidak valid. Coba tulis ulang kalimat tagihan.") },
          { status: 502 }
        );
      }
    }

    // Derive the owner from the session, never from the request body.
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

    const admin = createAdminClient();

    const { data: invoice, error: rpcError } = await admin.rpc("publish_invoice", {
      p_owner_id: user.id,
      p_client_name: parsed.client_name,
      p_description: parsed.description,
      p_amount: parsed.amount,
      p_currency: parsed.currency ?? "IDR",
      p_due_date: parsed.due_date,
      p_cta_message: parsed.cta_message,
    });

    if (rpcError || !invoice) {
      const msg = (rpcError?.message ?? "").toUpperCase();
      if (msg.includes("NO_CREDITS")) {
        return NextResponse.json(
          {
            error: apiError(
              lang,
              "No invoice credits left. Invite a client through your invoice to earn more.",
              "Kredit invoice habis. Ajak klien daftar lewat invoicemu untuk kredit tambahan."
            ),
          },
          { status: 402 }
        );
      }
      if (msg.includes("PLAN_LIMIT")) {
        return NextResponse.json(
          {
            error: apiError(
              lang,
              "You reached your plan's invoice limit. Upgrade for more, or invite a client to earn credits.",
              "Limit invoice paketmu tercapai. Upgrade untuk kuota lebih, atau ajak klien daftar untuk kredit."
            ),
          },
          { status: 402 }
        );
      }
      console.error("publish error", rpcError?.message);
      return NextResponse.json(
        { error: apiError(lang, "Could not publish the invoice. Try again.", "Gagal menerbitkan invoice. Coba lagi.") },
        { status: 500 }
      );
    }

    // The origin this request arrived on, not a configured one: a link copied
    // on localhost should be a localhost link, and one copied in production a
    // production link.
    const origin = new URL(req.url).origin;
    const shareUrl = `${origin}/invoice/${invoice.public_id}`;

    return NextResponse.json({ invoice, share_url: shareUrl });
  } catch (err: any) {
    console.error("invoice create error", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat invoice. Coba lagi." },
      { status: 500 }
    );
  }
}
