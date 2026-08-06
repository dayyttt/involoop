import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// A view counter must never be cached.
export const dynamic = "force-dynamic";

// Public read for the shared invoice page. Uses the service-role client on
// purpose: RLS blocks anon reads of invoices, and the page is open to clients
// who are not logged in. Server-side lookup via public_id only.
//
// View tracking happens via POST /api/invoices/view (client-fired, uncached) —
// NOT here, because the CDN caches GET responses and stalls any counter.
export async function GET(
  _req: NextRequest,
  { params }: { params: { public_id: string } }
) {
  const supabase = createAdminClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "public_id, number, client_name, description, amount, currency, status, due_date, cta_message, views, created_at, owner:profiles(full_name, referral_code)"
    )
    .eq("public_id", params.public_id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
  }

  const res = NextResponse.json({
    invoice: {
      ...invoice,
      sender_name:
        (Array.isArray(invoice.owner) ? invoice.owner[0] : invoice.owner)?.full_name ??
        "Freelancer",
    },
  });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
