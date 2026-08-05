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

  if (loading) return <main className="centered">Memuat...</main>;
  if (!profile)
    return (
      <main className="centered">
        Belum login. <Link href="/signup">Daftar / masuk dulu</Link>.
      </main>
    );

  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>
        <button onClick={handleLogout} className="btn btn-ghost">
          Keluar
        </button>
      </nav>

      <main className="page-shell">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            Halo, {profile.full_name ?? "freelancer"}
          </h1>
          <Link href="/dashboard/new-invoice" className="btn btn-primary">
            + Buat invoice
          </Link>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <div className="stat-label">Kredit invoice tersisa</div>
            <div className="stat-value">{profile.free_invoice_credits}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Referral berhasil</div>
            <div className="stat-value">{referralCount}</div>
          </div>
        </div>

        <h2 className="section-title">Referral</h2>
        {referrals.length === 0 ? (
          <p className="empty">
            Belum ada referral. CTA di tiap invoice yang mengajak klienmu daftar.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
            {referrals.map((ref) => (
              <div key={ref.id} className="list-item">
                <span>{ref.referred?.full_name || ref.referred?.email || "Pengguna baru"}</span>
                <span className="side">
                  <span className="badge badge-paid">+{ref.reward_credits} kredit</span>
                  <span className="hint">
                    {new Date(ref.created_at).toLocaleDateString("id-ID")}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        <h2 className="section-title">Invoice terkirim</h2>
        {invoices.length === 0 && (
          <p className="empty">Belum ada invoice. Buat yang pertama.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {invoices.map((inv) => (
            <Link key={inv.id} href={`/invoice/${inv.public_id}`} className="list-item">
              <span>{inv.client_name}</span>
              <span className="side">
                <span>Rp {inv.amount.toLocaleString("id-ID")}</span>
                <span className={`badge ${inv.status === "paid" ? "badge-paid" : "badge-unpaid"}`}>
                  {inv.status === "paid" ? "Lunas" : "Belum bayar"}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
