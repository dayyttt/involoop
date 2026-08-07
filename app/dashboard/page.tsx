"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { formatMoney } from "@/lib/money";
import { appText, useLang } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

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
    plan?: string;
    plan_expires_at?: string | null;
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
  const lang = useLang();
  const t = (k: string) => appText(lang, k);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgraded, setUpgraded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("upgraded=")) {
      setUpgraded(true);
    }
  }, []);

  async function handleUpgrade(plan: "starter" | "pro") {
    setError(null);
    setUpgrading(true);
    const res = await fetch("/api/payments/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    setUpgrading(false);
    setError(data.error ?? t("dashboard.upgradeFailed"));
  }

  async function load() {
    setError(null);
    const res = await fetch("/api/dashboard");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? t("dashboard.loadFailed"));
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
      body: JSON.stringify({ public_id: publicId, lang }),
    });
    if (res.ok) load();
    else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? t("dashboard.verifyFailed"));
    }
  }

  async function handleConnectStripe() {
    setError(null);
    setConnecting(true);
    const res = await fetch("/api/payments/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang }),
    });
    setConnecting(false);
    if (res.ok) {
      load();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? t("dashboard.connectFailed"));
    }
  }

  async function handleResetDemo() {
    if (!window.confirm(t("dashboard.resetConfirm"))) return;
    setError(null);
    setResetting(true);
    const res = await fetch("/api/demo/reset", { method: "POST" });
    setResetting(false);
    if (res.ok) {
      load();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? t("dashboard.resetFailed"));
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
      setError(t("dashboard.copyFailed"));
    }
  }

  function whatsappLink(publicId: string) {
    const url = `${window.location.origin}/invoice/${publicId}`;
    return `https://wa.me/?text=${encodeURIComponent(t("newInvoice.whatsappText") + url)}`;
  }

  async function copyReferralCode() {
    try {
      await navigator.clipboard.writeText(profile?.referral_code ?? "");
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      setError(t("dashboard.copyFailed"));
    }
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
              {t("common.retry")}
            </button>
          </>
        ) : (
          <>
            {t("dashboard.notLoggedIn")} <Link href="/signup">{t("common.retry")}</Link>.
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
            {t("nav.createInvoice")}
          </Link>
          <LangToggle />
          <button onClick={handleLogout} className="btn btn-ghost">
            {t("nav.logout")}
          </button>
        </div>
      </nav>

      <main className="page-shell">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>
              {t("dashboard.greeting")} {profile.full_name ?? "freelancer"}
            </h1>
            <p className="hint" style={{ margin: 0 }}>
              {profile.email} · {profile.free_invoice_credits} {t("dashboard.creditsLeft")}
            </p>
          </div>
          <Link href="/dashboard/new-invoice" className="btn btn-primary" style={{ minHeight: 36 }}>
            {t("nav.createInvoice")}
          </Link>
        </div>

        <div className="stat-grid" style={{ marginTop: 20 }}>
          <Stat label={t("dashboard.credit")} value={profile.free_invoice_credits.toString()} />
          <Stat label={t("dashboard.views")} value={stats.total_views.toString()} />
          <Stat label={t("dashboard.clicks")} value={stats.total_clicks.toString()} />
          <Stat label={t("dashboard.referrals")} value={stats.signups.toString()} />
          <Stat label={t("dashboard.conversion")} value={stats.total_views > 0 ? `${stats.conversion}%` : "0"} />
          <Stat label={t("dashboard.creditsEarned")} value={stats.credits_earned.toString()} />
        </div>

        {error && <p className="error">{error}</p>}

        {upgraded && (
          <div className="success-panel" style={{ marginBottom: 12 }}>
            {t("dashboard.upgraded")}
          </div>
        )}

        <div className="card-panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 className="section-title" style={{ marginBottom: 4 }}>
              {t("dashboard.currentPlan")}: <PlanName plan={profile.plan} t={t} />
            </h2>
            {profile.plan !== "free" && profile.plan_expires_at && (
              <p className="hint" style={{ margin: 0 }}>
                {new Date(profile.plan_expires_at).toLocaleDateString(lang === "id" ? "id-ID" : "en-US")}
              </p>
            )}
          </div>
          {profile.plan === "free" && (
            <div className="side" style={{ gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-ghost"
                onClick={() => handleUpgrade("starter")}
                disabled={upgrading}
              >
                Starter · {t("dashboard.upgrade")}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleUpgrade("pro")}
                disabled={upgrading}
              >
                Pro · {t("dashboard.upgrade")}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            {t("dashboard.invoiceList")} ({stats.total})
          </h2>
          <div className="side" style={{ gap: 8 }}>
            <span className="badge badge-paid">{t("dashboard.paidCount")} {stats.paid}</span>
            <span className="badge badge-warn">{t("dashboard.awaitingCount")} {stats.awaiting}</span>
            <span className="badge badge-unpaid">{t("dashboard.unpaidCount")} {stats.unpaid}</span>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="card-panel" style={{ textAlign: "center", padding: "36px 20px" }}>
            <p className="section-eyebrow">{t("dashboard.emptyTitle")}</p>
            <p style={{ marginTop: 8 }}>{t("dashboard.emptyBody")}</p>
            <Link href="/dashboard/new-invoice" className="btn btn-primary" style={{ marginTop: 16 }}>
              {t("nav.createInvoice")}
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
                    {formatMoney(inv.amount, inv.currency, lang === "id" ? "id-ID" : "en-US")} · {inv.views} {t("dashboard.viewsCount")} ·{" "}
                    {new Date(inv.created_at).toLocaleDateString(lang === "id" ? "id-ID" : "en-US")}
                  </span>
                </div>
                <div className="inv-actions">
                  <StatusBadge status={inv.status} lang={lang} />
                  {inv.status === "awaiting_verification" && (
                    <button
                      className="btn btn-success"
                      onClick={() => handleVerify(inv.public_id)}
                    >
                      {t("dashboard.verify")}
                    </button>
                  )}
                  <a
                    href={whatsappLink(inv.public_id)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost"
                  >
                    {t("dashboard.sendWhatsapp")}
                  </a>
                  <button
                    className="btn btn-ghost"
                    onClick={() => copyInvoiceLink(inv.public_id)}
                  >
                    {copiedId === inv.public_id ? t("common.copied") : t("common.copyLink")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {profile.email.endsWith("@involoop.app") && (
          <div className="card-panel demo-reset" style={{ marginTop: 20 }}>
            <div>
              <h2 className="section-title">{t("dashboard.demoWorkspace")}</h2>
              <p className="hint">{t("dashboard.demoWorkspaceHint")}</p>
            </div>
            <button className="btn btn-ghost" onClick={handleResetDemo} disabled={resetting}>
              {resetting ? t("dashboard.resetting") : t("dashboard.resetWorkspace")}
            </button>
          </div>
        )}

        <div className="card-panel">
          <h2 className="section-title">{t("dashboard.referralSection")}</h2>
          <div className="ref-code">
            <code>{profile.referral_code}</code>
            <button
              className="btn btn-ghost"
              style={{ minHeight: 32, padding: "5px 12px", fontSize: 12 }}
              onClick={copyReferralCode}
            >
              {copiedRef ? t("common.copied") : t("common.copyCode")}
            </button>
          </div>
          <p className="hint" style={{ marginTop: 0 }}>
            {t("dashboard.referralCodeHint")}
          </p>
          {referrals.length === 0 ? (
            <p className="empty">
              {t("dashboard.referralEmpty")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {referrals.map((ref) => (
                <div key={ref.id} className="list-item">
                  <span>{ref.referred?.full_name || ref.referred?.email || t("dashboard.newUser")}</span>
                  <span className="side">
                    <span className="badge badge-paid">+{ref.reward_credits} {t("dashboard.credits")}</span>
                    <span className="hint">
                      {new Date(ref.created_at).toLocaleDateString(lang === "id" ? "id-ID" : "en-US")}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-panel">
          <h2 className="section-title">{t("dashboard.creditHistory")}</h2>
          {ledger.length === 0 ? (
            <p className="empty">{t("dashboard.creditHistoryEmpty")}</p>
          ) : (
            <div className="ledger-list">
              {ledger.map((entry) => (
                <div className="ledger-row" key={`${entry.created_at}-${entry.amount}-${entry.type}`}>
                  <span className={entry.amount > 0 ? "ledger-plus" : "ledger-minus"}>
                    {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                  </span>
                  <span className="ledger-ref">{entry.reference}</span>
                  <span className="hint">
                    {new Date(entry.created_at).toLocaleDateString(lang === "id" ? "id-ID" : "en-US")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <details className="card-panel" style={{ padding: 0 }}>
          <summary style={{ cursor: "pointer", padding: "16px 20px", fontWeight: 600, fontSize: 15 }}>
            {t("dashboard.paymentSettings")}
            <span className="hint" style={{ marginLeft: 10 }}>
              {profile.stripe_status === "connected" ? t("dashboard.connected") : t("dashboard.notConnected")}
            </span>
          </summary>
          <div style={{ padding: "0 20px 16px" }}>
            <div className="settings-rows">
              <div className="settings-row">
                <span>{t("dashboard.provider")}</span>
                <strong>Stripe Connect</strong>
              </div>
              <div className="settings-row">
                <span>{t("dashboard.connectionStatus")}</span>
                <strong className={profile.stripe_status === "connected" ? "text-ok" : ""}>
                  {profile.stripe_status === "connected" ? t("dashboard.connected") : t("dashboard.notConnected")}
                </strong>
              </div>
              <div className="settings-row">
                <span>{t("dashboard.mode")}</span>
                <strong>{t("dashboard.testMode")}</strong>
              </div>
              <div className="settings-row">
                <span>{t("dashboard.defaultCurrency")}</span>
                <strong>USD</strong>
              </div>
            </div>
            <p className="test-badge" style={{ marginTop: 14 }}>
              {t("dashboard.stripeTestBadge")}
            </p>
            {profile.stripe_status !== "connected" && (
              <button
                className="btn btn-primary"
                style={{ marginTop: 14 }}
                onClick={handleConnectStripe}
                disabled={connecting}
              >
                {connecting ? <><Spinner /> {t("dashboard.connecting")}</> : t("dashboard.connectStripe")}
              </button>
            )}
          </div>
        </details>
      </main>
    </>
  );
}

function PlanName({ plan, t }: { plan?: string; t: (k: string) => string }) {
  if (plan === "starter") return <>{t("dashboard.planStarter")}</>;
  if (plan === "pro") return <>{t("dashboard.planPro")}</>;
  return <>{t("dashboard.planFree")}</>;
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

function StatusBadge({ status, lang }: { status: string; lang: "en" | "id" }) {
  const t = (k: string) => appText(lang, k);
  if (status === "paid") return <span className="badge badge-paid">{t("status.paid")}</span>;
  if (status === "awaiting_verification")
    return <span className="badge badge-warn">{t("status.awaiting")}</span>;
  if (status === "payment_pending")
    return <span className="badge badge-warn">{t("status.pending")}</span>;
  if (status === "failed" || status === "refunded")
    return <span className="badge badge-unpaid">{t("status.failed")}</span>;
  return <span className="badge badge-unpaid">{t("status.unpaid")}</span>;
}
