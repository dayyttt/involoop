"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

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
  const refInvoice = searchParams.get("ref_invoice"); // present when arriving from an invoice page
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        ref_invoice_public_id: refInvoice ?? undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal mendaftar");
      return;
    }

    // Sign in immediately so the new user lands straight in their dashboard.
    await supabase.auth.signInWithPassword({ email, password });
    router.push("/dashboard");
  }

  return (
    <main className="auth-shell">
      <div className="card">
        <h1>Daftar Involoop</h1>
        <p className="sub">3 kredit invoice gratis, tambah lagi dari referral.</p>
        {refInvoice && (
          <p
            className="pill"
            style={{ marginBottom: 16 }}
          >
            Kamu diundang lewat invoice temanmu — dia dapat kredit, dan kamu
            dapat bonus kredit begitu daftar.
          </p>
        )}
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
