"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { formatMoney } from "@/lib/money";

interface Invoice {
  public_id: string;
  number: string;
  client_name: string;
  amount: number;
  currency: string;
  status: string;
  views: number;
  referral_clicks?: number;
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
  profile: {
    email: string;
    full_name: string | null;
    free_invoice_credits: number;
    referral_code: string;
    stripe_account_id: string | null;
    stripe_status: string;
  };
  invoices: Invoice[];
  ledger: LedgerEntry[];
  referrals: Referral[];
  stats: {
    total: number;
    paid: number;
    unpaid: number;
    awaiting: number;
    total_views: number;
    total_clicks: number;
    signups: number;
    conversion: number;
    credits_earned: number;
  };
}

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  async function handleConnectStripe() {
    setError(null);
    setConnecting(true);
    const res = await fetch("/api/payments/connect", { method: "POST" });
    setConnecting(false);
    if (res.ok) {
      load();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Gagal menghubungkan Stripe.");
    }
  }

  async function handleResetDemo() {
    if (!window.confirm("Reset seluruh data akun demo ini?")) return;
    setError(null);
    setResetting(true);
    const res = await fetch("/api/demo/reset", { method: "POST" });
    setResetting(false);
    if (res.ok) {
      load();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Gagal reset.");
    }
  }

  async function copyInvoiceLink(publicId: string) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/invoice/${publicId}`
      );
      setCopiedId(publicId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Gagal menyalin link.");
    }
  }

  function whatsappLink(publicId: string) {
    const url = `${window.location.origin}/invoice/${publicId}`;
    return `https://wa.me/?text=${encodeURIComponent("Halo, ini tagihan untuk kamu: " + url)}`;
  }

  if (loading)
    return (
      <main className="centered">
        <span className="spinner" />
      </main>
    );
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
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 className="page-title">Halo, {profile.full_name ?? "freelancer"}</h1>
          <Link href="/dashboard/new-invoice" className="btn btn-primary" style={{ minHeight: 36 }}>
            + Buat invoice
          </Link>
        </div>

        <div className="stat-grid">
          <Stat label="Credit balance" value={profile.free_invoice_credits.toString()} />
          <Stat label="Invoice views" value={stats.total_views.toString()} />
          <Stat label="Referral CTA clicks" value={stats.total_clicks.toString()} />
          <Stat label="Successful referrals" value={stats.signups.toString()} />
          <Stat label="Conversion" value={stats.total_views > 0 ? `${stats.conversion}%` : "—"} />
          <Stat label="Credits earned" value={stats.credits_earned.toString()} />
        </div>

        {error && <p className="error">{error}</p>}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Invoice ({stats.total})
          </h2>
          <div className="side" style={{ gap: 12 }}>
            <span className="badge badge-paid">Lunas {stats.paid}</span>
            <span className="badge badge-warn">Menunggu verifikasi {stats.awaiting}</span>
            <span className="badge badge-unpaid">Belum bayar {stats.unpaid}</span>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="card-panel" style={{ textAlign: "center", padding: "36px 20px" }}>
            <p className="section-eyebrow">MULAI DARI SINI</p>
            <p style={{ marginTop: 8 }}>
              Belum ada invoice. Terbitkan yang pertama — gratis pakai kreditmu.
            </p>
            <Link href="/dashboard/new-invoice" className="btn btn-primary" style={{ marginTop: 16 }}>
              + Buat invoice
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {invoices.map((inv) => (
              <div key={inv.public_id} className="list-item" style={{ flexWrap: "wrap", gap: 10 }}>
                <div className="side" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2, flex: "1 1 220px" }}>
                  <Link
                    href={`/invoice/${inv.public_id}`}
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    <strong>{inv.client_name}</strong> · {inv.number}
                  </Link>
                  <span className="hint">
                    {formatMoney(inv.amount, inv.currency)} · {inv.views} tampilan ·{" "}
                    {new Date(inv.created_at).toLocaleDateString("id-ID")}
                  </span>
                </div>
                <div className="side" style={{ gap: 8, flexWrap: "wrap" }}>
                  <StatusBadge status={inv.status} />
                  {inv.status === "awaiting_verification" && (
                    <button
                      className="btn btn-success"
                      style={{ minHeight: 34, padding: "6px 14px", fontSize: 12 }}
                      onClick={() => handleVerify(inv.public_id)}
                    >
                      Verifikasi
                    </button>
                  )}
                  <a
                    href={whatsappLink(inv.public_id)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost"
                    style={{ minHeight: 34, padding: "6px 12px", fontSize: 12 }}
                  >
                    WA
                  </a>
                  <button
                    className="btn btn-ghost"
                    style={{ minHeight: 34, padding: "6px 12px", fontSize: 12 }}
                    onClick={() => copyInvoiceLink(inv.public_id)}
                  >
                    {copiedId === inv.public_id ? "✓ Tersalin" : "Salin link"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {profile.email.endsWith("@involoop.app") && (
          <div className="card-panel demo-reset" style={{ marginTop: 20 }}>
            <div>
              <h2 className="section-title">Demo workspace</h2>
              <p className="hint">Reset invoices, payments, referrals, ledger, and credits for a clean presentation.</p>
            </div>
            <button className="btn btn-ghost" onClick={handleResetDemo} disabled={resetting}>
              {resetting ? "Resetting…" : "Reset Demo Workspace"}
            </button>
          </div>
        )}

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

        <details className="card-panel" style={{ padding: 0 }}>
          <summary style={{ cursor: "pointer", padding: "16px 20px", fontWeight: 600, fontSize: 15 }}>
            Payment Settings
            <span className="hint" style={{ marginLeft: 10 }}>
              {profile.stripe_status === "connected" ? "Connected" : "Not connected"}
            </span>
          </summary>
          <div style={{ padding: "0 20px 16px" }}>
            <div className="settings-rows">
              <div className="settings-row">
                <span>Payment provider</span>
                <strong>Stripe Connect</strong>
              </div>
              <div className="settings-row">
                <span>Connection status</span>
                <strong className={profile.stripe_status === "connected" ? "text-ok" : ""}>
                  {profile.stripe_status === "connected" ? "Connected" : "Not connected"}
                </strong>
              </div>
              <div className="settings-row">
                <span>Mode</span>
                <strong>Test Mode</strong>
              </div>
              <div className="settings-row">
                <span>Default settlement currency</span>
                <strong>USD</strong>
              </div>
            </div>
            <p className="test-badge" style={{ marginTop: 14 }}>
              Stripe Test Mode — no real money will be charged
            </p>
            {profile.stripe_status !== "connected" && (
              <button
                className="btn btn-primary"
                style={{ marginTop: 14 }}
                onClick={handleConnectStripe}
                disabled={connecting}
              >
                {connecting ? <><Spinner /> Connecting…</> : "Connect Stripe"}
              </button>
            )}
          </div>
        </details>
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

function Spinner() {
  return <span className="spinner" aria-hidden />;
}

function StatusBadge({ status }: { status: string }) {  if (status === "paid") return <span className="badge badge-paid">Paid</span>;
  if (status === "awaiting_verification")
    return <span className="badge badge-warn">Awaiting verification</span>;
  if (status === "payment_pending")
    return <span className="badge badge-warn">Payment in progress</span>;
  if (status === "failed" || status === "refunded")
    return <span className="badge badge-unpaid">Failed</span>;
  return <span className="badge badge-unpaid">Unpaid</span>;
}
