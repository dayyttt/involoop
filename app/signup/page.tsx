"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function Signup() {
  return (
    <Suspense fallback={<main style={{ padding: 40 }}>Memuat...</main>}>
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
    <main style={{ maxWidth: 400, margin: "60px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Daftar Involoop</h1>
      {refInvoice && (
        <p style={{ fontSize: 13, color: "#1a7f37", marginBottom: 16 }}>
          Kamu diundang lewat invoice temanmu — dia dapat kredit, dan kamu dapat bonus kredit begitu daftar.
        </p>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          placeholder="Nama lengkap"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: 12, background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
        >
          {loading ? "Mendaftar..." : "Daftar"}
        </button>
      </form>
      {error && <p style={{ color: "#c0362c", marginTop: 12 }}>{error}</p>}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #ddd",
  fontSize: 15,
};
