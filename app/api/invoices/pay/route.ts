import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Simulated payment: hackathon scope intentionally skips real payment
// processing so the demo never depends on an external gateway being up.
// Expects: { public_id: string }
export async function POST(req: NextRequest) {
  try {
    const { public_id } = await req.json();
    if (!public_id) {
      return NextResponse.json({ error: "public_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: invoice, error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("public_id", public_id)
      .eq("status", "unpaid") // idempotency guard against double-pay
      .select()
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found or already paid" },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice });
  } catch (err: any) {
    console.error("invoice pay error", err);
    return NextResponse.json({ error: "Terjadi kesalahan saat membayar. Coba lagi." }, { status: 500 });
  }
}
