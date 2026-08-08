import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { apiError } from "@/lib/api-lang";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { paypalConfigured, paypalSupportsCurrency } from "@/lib/paypal";
import { solanaConfigured } from "@/lib/solana";

// A view counter must never be cached.
export const dynamic = "force-dynamic";

// Public read for the shared invoice page. Uses the service-role client on
// purpose: RLS blocks anon reads of invoices, and the page is open to clients
// who are not logged in. Server-side lookup via public_id only.
//
// View tracking happens via POST /api/invoices/view (client-fired, uncached) —
// NOT here, because the CDN caches GET responses and stalls any counter.
// Owner-only, despite the public_id in the path. Its only caller is the
// dashboard's invoice modal, which by definition is looking at its own row —
// the client-facing page is rendered server-side from getPublicInvoice and
// never touches this route. Left open it answered anyone, which cost two things:
// the view count, which is the freelancer's private number, and the owner's
// Solana address in full. That last one does not stay a payment detail. An
// address plus a real name is a permanent link to a public ledger, so anyone
// walking invoice ids could have harvested both together.
export async function GET(
  _req: NextRequest,
  { params }: { params: { public_id: string } }
) {
  const { user, response } = await requireOwner(undefined);
  if (!user) return response!;

  const supabase = createAdminClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "public_id, number, client_name, description, amount, currency, amount_minor, status, due_date, cta_message, views, created_at, owner_id, owner:profiles(full_name, solana_wallet, solana_wallet_verified_at)"
    )
    .eq("public_id", params.public_id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  // Same answer for "does not exist" and "not yours": a different one would
  // turn this into an oracle for which invoice ids are real.
  if (invoice.owner_id !== user.id) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  // Pulled out of the row rather than spread with it. The wallet is read here to
  // answer one yes/no question and must not travel any further than that.
  const { owner: ownerRel, owner_id: _ownerId, ...row } = invoice as Record<string, any>;
  const owner = Array.isArray(ownerRel) ? ownerRel[0] : ownerRel;

  const res = NextResponse.json({
    invoice: {
      ...row,
      sender_name: owner?.full_name ?? "Freelancer",
      paypal_enabled: paypalConfigured() && paypalSupportsCurrency(invoice.currency),
      crypto_enabled:
        solanaConfigured() &&
        invoice.currency === "USD" &&
        !!owner?.solana_wallet &&
        !!owner?.solana_wallet_verified_at,
    },
  });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

// GET above is public on purpose. PATCH and DELETE are the opposite: they take
// the owner from the session cookie and hand it to an RPC that matches it
// against the row. A public_id in the URL proves nothing about who is asking.
async function requireOwner(lang: unknown) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: apiError(lang, "You are not signed in.", "Kamu belum login.") },
        { status: 401 }
      ),
    };
  }
  return { user, response: null };
}

// Maps an RPC exception to something a person can act on. The migration case is
// explicit rather than a generic failure, because "run migration-p3" is a very
// different instruction from "try again".
function rpcMessage(msg: string, lang: unknown): { error: string; status: number } {
  if (msg.includes("INVOICE_NOT_FOUND")) {
    return {
      error: apiError(lang, "Invoice not found.", "Invoice tidak ditemukan."),
      status: 404,
    };
  }
  if (msg.includes("INVOICE_LOCKED")) {
    return {
      error: apiError(
        lang,
        "This invoice can no longer be edited — your client has already acted on it. Cancel it and send a new one instead.",
        "Invoice ini tidak bisa diubah lagi — klienmu sudah menindaklanjutinya. Hapus dan kirim yang baru."
      ),
      status: 409,
    };
  }
  if (msg.includes("INVOICE_PAID")) {
    return {
      error: apiError(
        lang,
        "A paid invoice cannot be deleted — it is the record of money you received.",
        "Invoice lunas tidak bisa dihapus — itu bukti uang yang sudah kamu terima."
      ),
      status: 409,
    };
  }
  if (msg.includes("UNSUPPORTED_CURRENCY")) {
    return {
      error: apiError(lang, "Currency is not supported.", "Currency tidak didukung."),
      status: 400,
    };
  }
  if (msg.includes("INVALID_AMOUNT") || msg.includes("MISSING_FIELDS")) {
    return {
      error: apiError(
        lang,
        "Fill in the client name, description, and a valid amount.",
        "Lengkapi nama klien, deskripsi, dan nominal yang valid."
      ),
      status: 400,
    };
  }
  // PGRST202: the function does not exist yet in this database.
  if (msg.includes("PGRST202") || msg.includes("Could not find the function")) {
    return {
      error: apiError(
        lang,
        "Editing is not enabled on this database yet — run supabase/migration-p3-invoice-crud.sql.",
        "Fitur edit belum aktif di database ini — jalankan supabase/migration-p3-invoice-crud.sql."
      ),
      status: 501,
    };
  }
  return {
    error: apiError(lang, "Could not save. Try again.", "Gagal menyimpan. Coba lagi."),
    status: 500,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { public_id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const { client_name, description, amount, currency, due_date, lang } = body;

  const { user, response } = await requireOwner(lang);
  if (!user) return response;

  const name = typeof client_name === "string" ? client_name.trim() : "";
  const desc = typeof description === "string" ? description.trim() : "";
  const value = Number(amount);

  if (!name || !desc || !Number.isFinite(value) || value <= 0) {
    return NextResponse.json(
      {
        error: apiError(
          lang,
          "Fill in the client name, description, and a valid amount.",
          "Lengkapi nama klien, deskripsi, dan nominal yang valid."
        ),
      },
      { status: 400 }
    );
  }
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return NextResponse.json(
      { error: apiError(lang, "Currency is not supported.", "Currency tidak didukung.") },
      { status: 400 }
    );
  }

  const { data, error } = await createAdminClient().rpc("update_invoice", {
    p_owner_id: user.id,
    p_public_id: params.public_id,
    p_client_name: name,
    p_description: desc,
    p_amount: value,
    p_currency: currency,
    p_due_date: due_date || null,
  });

  if (error) {
    const mapped = rpcMessage(`${error.message} ${error.code ?? ""}`, lang);
    if (mapped.status === 500) console.error("update_invoice error", error.message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }

  return NextResponse.json({ invoice: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { public_id: string } }
) {
  const lang = req.nextUrl.searchParams.get("lang");

  const { user, response } = await requireOwner(lang);
  if (!user) return response;

  const { data, error } = await createAdminClient().rpc("delete_invoice", {
    p_owner_id: user.id,
    p_public_id: params.public_id,
  });

  if (error) {
    const mapped = rpcMessage(`${error.message} ${error.code ?? ""}`, lang);
    if (mapped.status === 500) console.error("delete_invoice error", error.message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }

  return NextResponse.json({ deleted: data });
}
