import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { apiError } from "@/lib/api-lang";

// Honest simulated payment flow:
//   B clicks "Saya sudah transfer" -> status becomes 'awaiting_verification'
//   A verifies on the dashboard  -> status becomes 'paid'
// The invoice is never claimed paid by the buyer themselves.
// Expects: { public_id: string, lang?: "en" | "id" }
export async function POST(req: NextRequest) {
  try {
    const { public_id, lang } = await req.json();
    if (!public_id) {
      return NextResponse.json({ error: "public_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: invoice, error } = await supabase
      .from("invoices")
      .update({ status: "awaiting_verification" })
      .eq("public_id", public_id)
      .in("status", ["unpaid", "payment_pending"]) // abandoned PayPal order falls back to manual
      .select("public_id, status")
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: apiError(lang, "Invoice not found or already processed.", "Invoice tidak ditemukan atau sudah diproses.") },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice });
  } catch (err: any) {
    console.error("invoice confirm error", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan. Coba lagi." },
      { status: 500 }
    );
  }
}
