"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

interface Invoice {
  public_id: string;
  number: string;
  client_name: string;
  amount: number;
  status: string;
  views: number;
  created_at: string;
}

interface LedgerEntry {
  amount: number;
  type: string;
  reference: string;
  created_at: string;
}

interface Referral {
  id: string;
  created_at: string;
  reward_credits: number;
  referred: { full_name: string | null; email: string } | null;
}

interface DashboardData {
  profile: { full_name: string | null; free_invoice_credits: number; referral_code: string };
  invoices: Invoice[];
  ledger: LedgerEntry[];
  referrals: Referral[];
  stats: {
    total: number;
    paid: number;
    unpaid: number;
    awaiting: number;
    total_views: number;
    signups: number;
    conversion: number;
  };
}

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/dashboard");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Gagal memuat dashboard.");
      setLoading(false);
      return;
    }
    setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleVerify(publicId: string) {
    const res = await fetch("/api/invoices/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId }),
    });
    if (res.ok) load();
    else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Gagal verifikasi.");
    }
  }

  if (loading) return <main className="centered">Memuat...</main>;
  if (!data)
    return (
      <main className="centered">
        {error ? (
          <>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={load} style={{ marginTop: 16 }}>
              Coba lagi
            </button>
          </>
        ) : (
          <>
            Belum login. <Link href="/signup">Daftar / masuk dulu</Link>.
          </>
        )}
      </main>
    );

  const { profile, invoices, ledger, referrals, stats } = data;

  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/dashboard/new-invoice" className="btn btn-primary">
            + Buat invoice
          </Link>
          <button onClick={handleLogout} className="btn btn-ghost">
            Keluar
          </button>
        </div>
      </nav>

      <main className="page-shell">
        <h1 className="page-title">Halo, {profile.full_name ?? "freelancer"}</h1>

        <div className="stat-grid">
          <Stat label="Saldo kredit" value={profile.free_invoice_credits.toString()} />
          <Stat label="Referral berhasil" value={stats.signups.toString()} />
          <Stat label="Tampilan invoice" value={stats.total_views.toString()} />
          <Stat
            label="Konversi"
            value={stats.total_views > 0 ? `${stats.conversion}%` : "—"}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="card-panel">
          <h2 className="section-title">Riwayat kredit</h2>
          {ledger.length === 0 ? (
            <p className="empty">Belum ada pergerakan kredit.</p>
          ) : (
            <div className="ledger-list">
              {ledger.map((entry) => (
                <div className="ledger-row" key={`${entry.created_at}-${entry.amount}-${entry.type}`}>
                  <span className={entry.amount > 0 ? "ledger-plus" : "ledger-minus"}>
                    {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                  </span>
                  <span className="ledger-ref">{entry.reference}</span>
                  <span className="hint">
                    {new Date(entry.created_at).toLocaleDateString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-panel">
          <h2 className="section-title">Referral</h2>
          {referrals.length === 0 ? (
            <p className="empty">
              Belum ada referral. CTA di tiap invoice yang mengajak klienmu daftar.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
        </div>

        <h2 className="section-title">
          Invoice terkirim ({stats.total}) · Lunas {stats.paid} · Menunggu verifikasi{" "}
          {stats.awaiting} · Belum bayar {stats.unpaid}
        </h2>
        {invoices.length === 0 && (
          <p className="empty">
            Belum ada invoice. Buat yang pertama.
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {invoices.map((inv) => (
            <div key={inv.public_id} className="list-item">
              <div className="side" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <Link
                  href={`/invoice/${inv.public_id}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <strong>{inv.client_name}</strong> · {inv.number}
                </Link>
                <span className="hint">
                  Rp {inv.amount.toLocaleString("id-ID")} · {inv.views} tampilan
                </span>
              </div>
              <div className="side">
                <StatusBadge status={inv.status} />
                {inv.status === "awaiting_verification" && (
                  <button
                    className="btn btn-success"
                    style={{ minHeight: 34, padding: "6px 14px", fontSize: 12 }}
                    onClick={() => handleVerify(inv.public_id)}
                  >
                    Verifikasi pembayaran
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <span className="badge badge-paid">Lunas</span>;
  if (status === "awaiting_verification")
    return <span className="badge badge-warn">Menunggu verifikasi</span>;
  return <span className="badge badge-unpaid">Belum bayar</span>;
}
