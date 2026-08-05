import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Public read for the shared invoice page. Uses the service-role client on
// purpose: RLS blocks anon reads of invoices, and the page is open to clients
// who are not logged in. Server-side lookup via public_id only.
export async function GET(
  _req: NextRequest,
  { params }: { params: { public_id: string } }
) {
  const supabase = createAdminClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("public_id, client_name, description, amount, status, cta_message, due_date")
    .eq("public_id", params.public_id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}
