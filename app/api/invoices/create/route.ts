import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { parseInvoiceFromText } from "@/lib/claude";

// Expects: { raw_text: string }
// raw_text example: "tagih Rina 2 juta buat desain logo, jatuh tempo 2 minggu"
export async function POST(req: NextRequest) {
  try {
    const { raw_text } = await req.json();

    if (!raw_text || typeof raw_text !== "string") {
      return NextResponse.json({ error: "raw_text is required" }, { status: 400 });
    }

    // Derive the owner from the session, never from the request body.
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = user.id;
    const admin = createAdminClient();

    // Check free credits before spending an AI call
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("free_invoice_credits")
      .eq("id", ownerId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if (profile.free_invoice_credits <= 0) {
      return NextResponse.json(
        { error: "Kredit invoice habis. Ajak klien daftar untuk dapat kredit tambahan." },
        { status: 402 }
      );
    }

    const parsed = await parseInvoiceFromText(raw_text);

    const { data: invoice, error: insertError } = await admin
      .from("invoices")
      .insert({
        owner_id: ownerId,
        client_name: parsed.client_name,
        description: parsed.description,
        amount: parsed.amount,
        due_date: parsed.due_date,
        cta_message: parsed.cta_message,
      })
      .select()
      .single();

    if (insertError || !invoice) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create invoice" },
        { status: 500 }
      );
    }

    await admin
      .from("profiles")
      .update({ free_invoice_credits: profile.free_invoice_credits - 1 })
      .eq("id", ownerId);

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
