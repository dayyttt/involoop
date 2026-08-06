import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Public read for the shared invoice page. Uses the service-role client on
// purpose: RLS blocks anon reads of invoices, and the page is open to clients
// who are not logged in. Server-side lookup via public_id only.
//
// View tracking: a cookie guards the counter so refreshing the same browser
// does not inflate the number judges look at.
export async function GET(
  req: NextRequest,
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

  const cookieName = `invview_${params.public_id}`;
  const alreadyViewed = req.cookies.get(cookieName)?.value === "1";

  let views = invoice.views;
  if (!alreadyViewed) {
    const { data: updated } = await supabase
      .from("invoices")
      .update({ views: (invoice.views ?? 0) + 1 })
      .eq("public_id", params.public_id)
      .select("views")
      .single();
    views = updated?.views ?? invoice.views;
  }

  const res = NextResponse.json({
    invoice: {
      ...invoice,
      views,
      sender_name: (Array.isArray(invoice.owner) ? invoice.owner[0] : invoice.owner)?.full_name ?? "Freelancer",
    },
  });

  if (!alreadyViewed) {
    res.cookies.set(cookieName, "1", {
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return res;
}
