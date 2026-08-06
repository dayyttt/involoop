import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { apiError } from "@/lib/api-lang";

// Expects: { email: string, password: string, full_name: string,
//            ref_invoice_public_id?: string }
// ref_invoice_public_id is present when the user signed up via the CTA on
// someone else's invoice page — this is what wires the loop end to end.
export async function POST(req: NextRequest) {
  const { email, password, full_name, ref_invoice_public_id, lang } = await req.json().catch(() => ({}));
  try {

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: apiError(lang, "Email and password are required.", "Email dan password wajib diisi.") },
        { status: 400 }
      );
    }
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: apiError(lang, "Password must be at least 6 characters.", "Password minimal 6 karakter.") },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      const msg = (authError?.message ?? "").toLowerCase();
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        return NextResponse.json(
          { error: apiError(lang, "This email is already registered. Sign in instead.", "Email ini sudah terdaftar. Coba masuk langsung.") },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: apiError(lang, "Signup failed. Try another email.", "Pendaftaran gagal. Coba email lain.") },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;

    const { data: result, error: rpcError } = await supabase.rpc("finalize_signup", {
      p_user_id: newUserId,
      p_email: normalizedEmail,
      p_full_name: typeof full_name === "string" ? full_name : null,
      p_ref_invoice_public_id: ref_invoice_public_id ?? null,
    });

    if (rpcError || !result) {
      // Clean up the orphan auth user so retry can work.
      await supabase.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: apiError(lang, "Could not finish signup. Try again.", "Gagal menyelesaikan pendaftaran. Coba lagi.") },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user_id: newUserId,
      credits: result.credits,
      rewarded_referrer: result.rewarded_referrer,
    });
  } catch (err: any) {
    console.error("signup error", err);
    return NextResponse.json(
      { error: apiError(lang, "Signup failed. Try again.", "Gagal mendaftar. Coba lagi.") },
      { status: 500 }
    );
  }
}
