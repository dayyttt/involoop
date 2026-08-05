"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

interface Invoice {
  id: string;
  public_id: string;
  client_name: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Profile {
  full_name: string | null;
  free_invoice_credits: number;
  referral_code: string;
}

interface Referral {
  id: string;
  created_at: string;
  reward_credits: number;
  referred: { full_name: string | null; email: string } | null;
}

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, free_invoice_credits, referral_code")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("id, public_id, client_name, amount, status, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      setInvoices(invoiceData ?? []);

      const { count } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", user.id)
        .eq("status", "rewarded");
      setReferralCount(count ?? 0);

      const res = await fetch("/api/referrals");
      if (res.ok) {
        const data = await res.json();
        setReferrals(data.referrals ?? []);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return <main style={{ padding: 40 }}>Memuat...</main>;
  if (!profile)
    return (
      <main style={{ padding: 40 }}>
        Belum login. <Link href="/signup">Daftar / masuk dulu</Link>.
      </main>
    );

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24 }}>Halo, {profile.full_name ?? "freelancer"}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/dashboard/new-invoice"
            style={{ padding: "10px 18px", background: "#111", color: "#fff", borderRadius: 8, textDecoration: "none" }}
          >
            + Buat invoice
          </Link>
          <button
            onClick={handleLogout}
            style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 8, background: "#fff", cursor: "pointer" }}
          >
            Keluar
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        <StatCard label="Kredit invoice tersisa" value={profile.free_invoice_credits.toString()} />
        <StatCard label="Referral berhasil" value={referralCount.toString()} />
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Referral</h2>
      {referrals.length === 0 ? (
        <p style={{ color: "#777", marginBottom: 24 }}>Belum ada referral. CTA di tiap invoice yang mengajak klienmu daftar.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {referrals.map((ref) => (
            <div
              key={ref.id}
              style={{ display: "flex", justifyContent: "space-between", padding: 14, border: "1px solid #eee", borderRadius: 10 }}
            >
              <span>{ref.referred?.full_name || ref.referred?.email || "Pengguna baru"}</span>
              <span style={{ color: "#666", fontSize: 13 }}>
                {new Date(ref.created_at).toLocaleDateString("id-ID")} · +{ref.reward_credits} kredit
              </span>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Invoice terkirim</h2>
      {invoices.length === 0 && <p style={{ color: "#777" }}>Belum ada invoice. Buat yang pertama.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {invoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/invoice/${inv.public_id}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: 14,
              border: "1px solid #eee",
              borderRadius: 10,
              textDecoration: "none",
              color: "#111",
            }}
          >
            <span>{inv.client_name}</span>
            <span>Rp {inv.amount.toLocaleString("id-ID")}</span>
            <span style={{ color: inv.status === "paid" ? "#1a7f37" : "#a15c00" }}>
              {inv.status === "paid" ? "Lunas" : "Belum bayar"}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, padding: 16, border: "1px solid #eee", borderRadius: 10 }}>
      <div style={{ fontSize: 12, color: "#777" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
