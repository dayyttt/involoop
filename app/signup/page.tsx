"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

const REF_COOKIE = "ref_invoice";

export default function Signup() {
  return (
    <Suspense fallback={<main className="centered">Memuat...</main>}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refInvoice = searchParams.get("ref_invoice") ?? null; // present when arriving from an invoice page
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist the referral outside React state so it survives a refresh even if
  // the URL query is lost.
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
      setError("Password minimal 6 karakter.");
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
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal mendaftar. Coba lagi.");
      return;
    }

    // Sign in immediately so the new user lands straight in their dashboard.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      setError("Akun berhasil dibuat. Silakan masuk lewat halaman login.");
      router.push("/login");
      return;
    }

    document.cookie = `${REF_COOKIE}=; path=/; max-age=0`;
    router.push("/dashboard");
  }

  async function handleOAuth(provider: "google" | "github") {
    setError(null);
    const ref = refInvoice ?? getRefFromCookie();
    if (ref) {
      document.cookie = `${REF_COOKIE}=${ref}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError("Gagal memulai login. Coba lagi.");
    }
  }

  return (
    <main className="auth-shell">
      <div className="card">
        <h1>Daftar Involoop</h1>
        <p className="sub">3 kredit invoice gratis, tambah lagi dari referral.</p>
        {refInvoice && (
          <p className="note-box">
            Kamu diundang lewat invoice temanmu — dia dapat kredit, dan kamu
            dapat bonus kredit begitu daftar.
          </p>
        )}
        <div className="oauth-row">
          <button type="button" className="btn btn-ghost" onClick={() => handleOAuth("google")}>
            Continue with Google
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => handleOAuth("github")}>
            Continue with GitHub
          </button>
        </div>
        <div className="divider"><span>or sign up with email</span></div>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div className="field">
            <label htmlFor="fullName">Nama lengkap</label>
            <input
              id="fullName"
              className="input"
              placeholder="Mis. Budi Santoso"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              placeholder="kamu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <p className="hint" style={{ marginTop: 16 }}>
          Sudah punya akun? <Link href="/login">Masuk</Link>.
        </p>
      </div>
    </main>
  );
}
