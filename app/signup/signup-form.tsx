"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { appText } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

const REF_COOKIE = "ref_invoice";

export default function SignupForm({
  refInvoice,
  plan,
  next,
}: {
  refInvoice: string | null;
  plan: "starter" | "pro" | null;
  next?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const lang = useLang();
  const t = (k: string) => appText(lang, k);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist the referral in a cookie so it survives a refresh even if the URL
  // query is lost, and so the OAuth callback can restore attribution.
  useEffect(() => {
    if (refInvoice) {
      document.cookie = `${REF_COOKIE}=${refInvoice}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
  }, [refInvoice]);

  function getRefFromCookie() {
    const match = document.cookie.match(/(?:^|;\s*)ref_invoice=([^;]+)/);
    return match ? match[1] : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError(t("signup.shortPassword"));
      setLoading(false);
      return;
    }

    const ref = refInvoice ?? getRefFromCookie();
    const normalizedEmail = email.trim().toLowerCase();

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        full_name: fullName,
        ref_invoice_public_id: ref ?? undefined,
        lang,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? t("signup.signupFail"));
      return;
    }

    // Sign in immediately so the new user lands straight in their dashboard.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      setError(t("signup.createdSignIn"));
      router.push("/login");
      return;
    }

    document.cookie = `${REF_COOKIE}=; path=/; max-age=0`;

    // The plan choice travels to the dashboard, which opens the payment modal
    // for it. This used to fire the upgrade call from here and, if it failed —
    // a session cookie the server could not see yet, PayPal down, anything —
    // fall through to the invoice creator without a word. Someone who clicked
    // "Upgrade Pro" and made an account got neither the plan nor an
    // explanation. It also means one purchase experience instead of two: the
    // same modal whether the plan is chosen on the landing page or before the
    // account existed.
    if (plan) {
      router.push(`/dashboard?upgrade=${plan}`);
      return;
    }

    // Someone who just created an account came to send an invoice, not to read
    // a dashboard of zeroes. Drop them straight into the creator.
    router.push(next ?? "/dashboard/new-invoice");
  }

  async function handleOAuth() {
    setError(null);
    const ref = refInvoice ?? getRefFromCookie();
    if (ref) {
      document.cookie = `${REF_COOKIE}=${ref}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
    if (next) {
      document.cookie = `oauth_next=${encodeURIComponent(next)}; path=/; max-age=600; SameSite=Lax`;
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(t("login.oauthFail"));
    }
  }

  return (
    <main className="auth-shell">
      <div className="card">
        <h1>{t("signup.title")}</h1>
        <p className="sub">{t("signup.sub")}</p>
        {plan && (
          <p className="note-box">
            {plan === "starter" ? "Starter · $3 one-time" : "Pro · $8 for 30 days"} · {t("login.payAfter")}
          </p>
        )}
        {refInvoice && (
          <p className="note-box">
            {t("signup.invited")}
          </p>
        )}
        <div className="oauth-row">
          <button type="button" className="btn btn-ghost" onClick={handleOAuth}>
            <GoogleIcon /> {t("signup.continueGoogle")}
          </button>
        </div>
        <div className="divider"><span>{t("signup.orEmail")}</span></div>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div className="field">
            <label htmlFor="fullName">{t("signup.fullName")}</label>
            <input
              id="fullName"
              className="input"
              placeholder={t("signup.fullNamePlaceholder")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="email">{t("signup.email")}</label>
            <input
              id="email"
              className="input"
              type="email"
              placeholder={t("signup.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">{t("signup.password")}</label>
            <input
              id="password"
              className="input"
              type="password"
              placeholder={t("signup.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t("signup.signingUp") : t("signup.createAccount")}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <p className="hint" style={{ marginTop: 16 }}>
          {t("signup.haveAccount")} <Link href="/login">{t("signup.signIn")}</Link>.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
