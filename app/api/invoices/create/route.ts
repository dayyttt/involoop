import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { parseInvoiceFromText } from "@/lib/claude";

// Expects: { raw_text: string }
// raw_text example: "tagih Rina 2 juta buat desain logo, jatuh tempo 2 minggu"
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { raw_text, manual, client_name, description, amount, due_date, cta_message } = body;

    let parsed;

    if (manual) {
      if (
        !client_name ||
        !description ||
        typeof amount !== "number" ||
        !(amount > 0)
      ) {
        return NextResponse.json(
          { error: "Lengkapi nama klien, deskripsi, dan nominal yang valid." },
          { status: 400 }
        );
      }
      parsed = {
        client_name: String(client_name),
        description: String(description),
        amount,
        due_date: due_date || null,
        cta_message: typeof cta_message === "string" ? cta_message : null,
      };
    } else if (!raw_text || typeof raw_text !== "string") {
      return NextResponse.json(
        { error: "Tulis kalimat tagihan dulu." },
        { status: 400 }
      );
    } else {
      try {
        parsed = await parseInvoiceFromText(raw_text);
      } catch (err: any) {
        console.error("AI parse error", err);
        return NextResponse.json(
          {
            error:
              "AI gagal menyusun invoice. Coba lagi, atau gunakan form manual di bawah.",
          },
          { status: 502 }
        );
      }

      if (!parsed.client_name || !parsed.description || typeof parsed.amount !== "number" || parsed.amount <= 0) {
        return NextResponse.json(
          { error: "Hasil AI tidak valid. Coba tulis ulang kalimat tagihan." },
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
      return NextResponse.json({ error: "Kamu belum login." }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: invoice, error: rpcError } = await admin.rpc("publish_invoice", {
      p_owner_id: user.id,
      p_client_name: parsed.client_name,
      p_description: parsed.description,
      p_amount: parsed.amount,
      p_currency: "IDR",
      p_due_date: parsed.due_date,
      p_cta_message: parsed.cta_message,
    });

    if (rpcError || !invoice) {
      const msg = (rpcError?.message ?? "").toUpperCase();
      if (msg.includes("NO_CREDITS")) {
        return NextResponse.json(
          {
            error:
              "Kredit invoice habis. Ajak klien daftar lewat invoicemu untuk kredit tambahan.",
          },
          { status: 402 }
        );
      }
      console.error("publish error", rpcError?.message);
      return NextResponse.json(
        { error: "Gagal menerbitkan invoice. Coba lagi." },
        { status: 500 }
      );
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${invoice.public_id}`;

    return NextResponse.json({ invoice, share_url: shareUrl });
  } catch (err: any) {
    console.error("invoice create error", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat invoice. Coba lagi." },
      { status: 500 }
    );
  }
}
