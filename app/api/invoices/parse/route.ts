import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { parseInvoiceFromText } from "@/lib/claude";

// Preview-only AI parse: turns a sentence into structured invoice fields so
// the owner can review and edit BEFORE publishing. Never deducts credits and
// never writes to the database.
// Expects: { raw_text: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { raw_text } = body;
    if (!raw_text || typeof raw_text !== "string") {
      return NextResponse.json(
        { error: "Tulis kalimat tagihan dulu." },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Kamu belum login." }, { status: 401 });
    }

    let parsed;
    try {
      parsed = await parseInvoiceFromText(raw_text);
    } catch (err: any) {
      console.error("AI parse error", err);
      return NextResponse.json(
        {
          error:
            "AI gagal menyusun invoice. Coba lagi, atau isi form manual di bawah.",
        },
        { status: 502 }
      );
    }

    if (
      !parsed.client_name ||
      !parsed.description ||
      typeof parsed.amount !== "number" ||
      parsed.amount <= 0
    ) {
      return NextResponse.json(
        { error: "Hasil AI tidak valid. Coba tulis ulang kalimat tagihan." },
        { status: 502 }
      );
    }

    return NextResponse.json({ parsed });
  } catch (err: any) {
    console.error("invoice parse error", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyusun invoice. Coba lagi." },
      { status: 500 }
    );
  }
}
