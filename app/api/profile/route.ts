import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { apiError } from "@/lib/api-lang";

// The profile a freelancer can actually change. Today that is the display name,
// which is not a cosmetic setting: it is the letterhead on every invoice and
// every PDF, so a typo made at signup has been going out to clients ever since.
//
// The row is always addressed by the session's user id, never by an id sent
// from the browser.
export const dynamic = "force-dynamic";

const MAX_NAME = 80;

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("email, full_name, referral_code, plan, free_invoice_credits, created_at")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  return NextResponse.json({ profile: data });
}

export async function PATCH(req: NextRequest) {
  const { full_name, lang } = await req.json().catch(() => ({}));

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: apiError(lang, "You are not signed in.", "Kamu belum login.") },
      { status: 401 }
    );
  }

  const name = typeof full_name === "string" ? full_name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2) {
    return NextResponse.json(
      {
        error: apiError(
          lang,
          "Your name needs at least 2 characters — it appears on every invoice you send.",
          "Nama minimal 2 karakter — nama ini muncul di setiap invoice yang kamu kirim."
        ),
      },
      { status: 400 }
    );
  }
  if (name.length > MAX_NAME) {
    return NextResponse.json(
      {
        error: apiError(
          lang,
          `Keep it under ${MAX_NAME} characters so it fits the invoice header.`,
          `Maksimal ${MAX_NAME} karakter agar muat di kop invoice.`
        ),
      },
      { status: 400 }
    );
  }

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ full_name: name })
    .eq("id", user.id);

  if (error) {
    console.error("profile update error", error.message);
    return NextResponse.json(
      { error: apiError(lang, "Could not save. Try again.", "Gagal menyimpan. Coba lagi.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile: { full_name: name } });
}
