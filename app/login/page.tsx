"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function Login() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("Email atau password salah.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main style={{ maxWidth: 400, margin: "60px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Masuk Involoop</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
          {loading ? "Masuk..." : "Masuk"}
        </button>
      </form>
      {error && <p style={{ color: "#c0362c", marginTop: 12 }}>{error}</p>}
      <p style={{ fontSize: 14, color: "#666", marginTop: 16 }}>
        Belum punya akun? <Link href="/signup">Daftar dulu</Link>.
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #ddd",
  fontSize: 15,
};
