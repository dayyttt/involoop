import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// Owner marks a buyer's transfer as verified -> invoice becomes 'paid'.
// Expects: { public_id: string }
export async function POST(req: NextRequest) {
  try {
    const { public_id } = await req.json();
    if (!public_id) {
      return NextResponse.json({ error: "public_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Kamu belum login." }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: invoice, error } = await admin
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("public_id", public_id)
      .eq("owner_id", user.id)
      .eq("status", "awaiting_verification")
      .select("public_id, status")
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: "Invoice tidak ditemukan atau belum dikonfirmasi klien." },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice });
  } catch (err: any) {
    console.error("invoice verify error", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan. Coba lagi." },
      { status: 500 }
    );
  }
}
