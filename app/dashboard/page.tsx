"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase-browser";
import { formatMoney, formatDateShort } from "@/lib/money";
import { appText } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";
import LangToggle from "@/components/LangToggle";
import StatusBadge from "@/components/StatusBadge";
import InvoiceModal, { type ModalInvoice } from "@/components/InvoiceModal";
import UpgradeModal, { type UpgradePlan } from "@/components/UpgradeModal";

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
  description?: string;
  due_date?: string | null;
  cta_message?: string | null;
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
    paypal_email: string | null;
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
  const [resetting, setResetting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<UpgradePlan | null>(null);
  const [upgraded, setUpgraded] = useState(false);
  const [filter, setFilter] = useState<"all" | "unpaid" | "awaiting" | "paid">("all");
  const [tab, setTab] = useState<"overview" | "invoices" | "loop">("overview");
  const [openInvoice, setOpenInvoice] = useState<ModalInvoice | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // The modal edits and deletes in place. Refetching the whole dashboard after
  // each change would blank the list and lose the person's scroll position, so
  // the local copy is patched and the derived numbers recompute from it.
  function applyInvoiceUpdate(next: ModalInvoice) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            invoices: prev.invoices.map((inv) =>
              inv.public_id === next.public_id ? { ...inv, ...next } : inv
            ),
          }
        : prev
    );
  }

  // The open invoice lives in the URL, so a refresh keeps it open and a link to
  // a specific invoice can be pasted anywhere. replaceState rather than push:
  // the back button should leave the dashboard, not unwind a modal.
  function openInvoiceModal(inv: ModalInvoice | null) {
    setOpenInvoice(inv);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (inv) url.searchParams.set("invoice", inv.public_id);
    else url.searchParams.delete("invoice");
    window.history.replaceState(null, "", url.toString());
  }

  function applyInvoiceDelete(publicId: string) {
    setData((prev) =>
      prev
        ? { ...prev, invoices: prev.invoices.filter((inv) => inv.public_id !== publicId) }
        : prev
    );
    setFlash(t("dashboard.detailDeleted"));
    setTimeout(() => setFlash(null), 3000);
  }

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("upgraded=")) {
      setUpgraded(true);
    }
  }, []);

  // A dashboard opened at ?invoice=<id> lands with that invoice already open.
  useEffect(() => {
    if (!data) return;
    const wanted = new URLSearchParams(window.location.search).get("invoice");
    if (!wanted) return;
    const match = data.invoices.find((inv) => inv.public_id === wanted);
    if (match) {
      setOpenInvoice(match);
      setTab("invoices");
    }
  }, [data]);


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
    // A full navigation, not router.push: the client router cache still holds
    // the landing page as it was rendered for a signed-in visitor, so pushing
    // to it returns a page that still says "Dashboard".
    window.location.assign("/");
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

  // A spinner in the middle of an empty page tells you nothing is happening.
  // A skeleton of the real layout tells you what is arriving, and where.
  if (loading)
    return (
      <main className="page-shell" aria-busy="true">
        <div className="skel skel-title" />
        <div className="skel skel-line" />
        <div className="money-grid" style={{ marginTop: 26 }}>
          <div className="skel skel-card" />
          <div className="skel skel-card" />
        </div>
        <div className="stat-grid" style={{ marginTop: 26 }}>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div className="skel skel-stat" key={n} />
          ))}
        </div>
        <div className="skel skel-row" />
        <div className="skel skel-row" />
        <div className="skel skel-row" />
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
            <p>{t("dashboard.notLoggedIn")}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              <Link href="/signup" className="btn btn-primary">
                {t("dashboard.signUp")}
              </Link>
              <Link href="/login" className="btn btn-ghost">
                {t("dashboard.signIn")}
              </Link>
            </div>
          </>
        )}
      </main>
    );

  const { profile, invoices, ledger, referrals, stats: serverStats } = data;

  // Everything that counts invoices is recomputed from the list held here, so
  // deleting one from the modal updates the donut, the filter chips and the
  // view totals in the same frame. Signups and credits come from the ledger and
  // referral tables, which the modal never touches, so those stay as served.
  const invoiceViews = invoices.reduce((sum, inv) => sum + (inv.views ?? 0), 0);
  const stats = {
    ...serverStats,
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "paid").length,
    unpaid: invoices.filter((i) => i.status === "unpaid").length,
    awaiting: invoices.filter((i) => i.status === "awaiting_verification").length,
    total_views: invoiceViews,
    total_clicks: invoices.reduce((sum, inv) => sum + (inv.referral_clicks ?? 0), 0),
    conversion:
      invoiceViews > 0 ? Math.round((serverStats.signups / invoiceViews) * 100) : 0,
  };

  // What a freelancer opens a dashboard for: how much is still owed and how
  // much has landed. Grouped per currency because one account can bill in IDR
  // and USD in the same week, and adding those together would be a lie.
  const byCurrency = invoices.reduce<Record<string, { billed: number; received: number; outstanding: number }>>(
    (acc, inv) => {
      const bucket = (acc[inv.currency] ??= { billed: 0, received: 0, outstanding: 0 });
      bucket.billed += inv.amount;
      if (inv.status === "paid") bucket.received += inv.amount;
      else if (inv.status !== "failed" && inv.status !== "refunded") bucket.outstanding += inv.amount;
      return acc;
    },
    {}
  );
  const currencies = Object.keys(byCurrency).sort((a, b) => byCurrency[b].billed - byCurrency[a].billed);
  // One saved address is the whole setup: it is where the money goes.
  const paypalReady = !!profile.paypal_email;

  // Invoices a client says they have paid. This is the one thing on the page
  // that is genuinely waiting on the owner, so it gets said out loud instead of
  // hiding as a button inside a row.
  const awaiting = invoices.filter((inv) => inv.status === "awaiting_verification");

  const FILTERS: { key: "all" | "unpaid" | "awaiting" | "paid"; label: string; count: number }[] = [
    { key: "all", label: t("dashboard.filterAll"), count: stats.total },
    { key: "unpaid", label: t("dashboard.filterUnpaid"), count: stats.unpaid },
    { key: "awaiting", label: t("dashboard.filterAwaiting"), count: stats.awaiting },
    { key: "paid", label: t("dashboard.filterPaid"), count: stats.paid },
  ];
  const filteredInvoices = invoices.filter((inv) => {
    if (filter === "all") return true;
    if (filter === "paid") return inv.status === "paid";
    if (filter === "awaiting") return inv.status === "awaiting_verification";
    return inv.status === "unpaid" || inv.status === "payment_pending" || inv.status === "failed";
  });

  // ---- Derived views of the same data, for the overview grid ----
  const primary = currencies[0];
  const primaryMoney = primary ? byCurrency[primary] : null;
  const locale = lang === "id" ? "id-ID" : "en-US";

  // Seven days of billing, from the invoices themselves. No invented series:
  // days with nothing published are simply empty columns.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const perDay = days.map((day) => {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const total = invoices
      .filter((inv) => {
        const at = new Date(inv.created_at);
        return at >= day && at < next && (!primary || inv.currency === primary);
      })
      .reduce((sum, inv) => sum + inv.amount, 0);
    return { day, total };
  });
  const peak = Math.max(...perDay.map((d) => d.total), 1);

  const split = [
    { key: "paid", value: stats.paid, color: "var(--success)" },
    { key: "awaiting", value: stats.awaiting, color: "var(--warn)" },
    { key: "unpaid", value: stats.unpaid, color: "var(--primary)" },
  ].filter((slice) => slice.value > 0);
  const splitTotal = split.reduce((sum, slice) => sum + slice.value, 0) || 1;
  let sweep = 0;
  const donut = split
    .map((slice) => {
      const from = (sweep / splitTotal) * 360;
      sweep += slice.value;
      const to = (sweep / splitTotal) * 360;
      return `${slice.color} ${from}deg ${to}deg`;
    })
    .join(", ");

  const TABS: { key: "overview" | "invoices" | "loop"; label: string }[] = [
    { key: "overview", label: t("dashboard.tabOverview") },
    { key: "invoices", label: t("dashboard.tabInvoices") },
    { key: "loop", label: t("dashboard.tabLoop") },
  ];

  const invoiceList = (
    <>
      {invoices.length > 0 && (
        <div className="chip-row" style={{ marginTop: 0, marginBottom: 12 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`chip ${filter === f.key ? "chip-active" : ""}`}
              aria-pressed={filter === f.key}
            >
              {f.label} <span className="chip-count">{f.count}</span>
            </button>
          ))}
        </div>
      )}

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
          {filteredInvoices.map((inv, index) => (
            <motion.div
              key={inv.public_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(index, 6) * 0.04 }}
            >
              <div className="list-item list-item-open" style={{ flexWrap: "wrap", gap: 10 }}>
                {/* The row itself opens the invoice. It used to link straight to
                    the client-facing page, which answered "what does my client
                    see" but never "what did I actually bill". */}
                <button
                  type="button"
                  className="row-open"
                  onClick={() => openInvoiceModal(inv)}
                  aria-label={`${t("dashboard.openDetail")} ${inv.number}`}
                >
                  <strong>{inv.client_name}</strong> · {inv.number}
                  <span className="hint">
                    {formatMoney(inv.amount, inv.currency, locale)} · {inv.views} {t("dashboard.viewsCount")} ·{" "}
                    {formatDateShort(inv.created_at, locale)}
                  </span>
                </button>
                <div className="inv-actions">
                  <StatusBadge status={inv.status} lang={lang} />
                  {inv.status === "awaiting_verification" && (
                    <button className="btn btn-success" onClick={() => handleVerify(inv.public_id)}>
                      {t("dashboard.verify")}
                    </button>
                  )}
                  <a href={whatsappLink(inv.public_id)} target="_blank" rel="noreferrer" className="btn btn-ghost">
                    {t("dashboard.sendWhatsapp")}
                  </a>
                  <button className="btn btn-ghost" onClick={() => copyInvoiceLink(inv.public_id)}>
                    {copiedId === inv.public_id ? t("common.copied") : t("common.copyLink")}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {filteredInvoices.length === 0 && (
            <p className="empty" style={{ padding: "16px 0" }}>{t("dashboard.emptyBody")}</p>
          )}
        </div>
      )}
    </>
  );

  const attentionStrip = awaiting.length > 0 && (
    <button
      type="button"
      className="attention"
      onClick={() => {
        setTab("invoices");
        setFilter("awaiting");
      }}
    >
      <span className="attention-pulse" aria-hidden />
      <span className="attention-text">
        <strong>
          {awaiting.length} {t("dashboard.attentionCount")}
        </strong>
        <span>{t("dashboard.attentionBody")}</span>
      </span>
      <span className="attention-go">{t("dashboard.attentionGo")}</span>
    </button>
  );

  return (
    <>
      <nav className="nav dash-nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>

        {/* The menu belongs up here, so the page stops being one long scroll
            and each view can be as dense as it needs to be. */}
        <div className="dash-tabs" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.key}
              role="tab"
              aria-selected={tab === item.key}
              className={`dash-tab${tab === item.key ? " dash-tab-on" : ""}`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="dash-nav-actions">
          <Link href="/dashboard/new-invoice" className="btn btn-primary">
            {t("nav.createInvoice")}
          </Link>
          <Link href="/dashboard/profile" className="btn btn-ghost dash-profile">
            {t("profile.open")}
          </Link>
          <LangToggle />
          <button onClick={handleLogout} className="btn btn-ghost dash-logout">
            {t("nav.logout")}
          </button>
        </div>
      </nav>

      <main className="dash-shell">
        {error && <p className="error">{error}</p>}
        {upgraded && <div className="success-panel" style={{ marginBottom: 12 }}>{t("dashboard.upgraded")}</div>}
        {attentionStrip}
        {!paypalReady && (
          <div className="setup-banner">
            <div>
              <strong>{t("dashboard.setupTitle")}</strong>
              <p>{t("dashboard.setupBody")}</p>
            </div>
            <Link className="btn btn-primary" href="/dashboard/profile#paypal">
              {t("dashboard.savePaypal")}
            </Link>
          </div>
        )}

        {tab === "overview" && (
          <div className="bento">
            {/* The balance card, and the two things you can do with it. */}
            <section className="bento-hero">
              <span className="bento-label">
                {primaryMoney && primaryMoney.outstanding === 0 && primaryMoney.billed > 0
                  ? t("dashboard.moneySettled")
                  : t("dashboard.moneyOutstanding")}
                {primary ? ` · ${primary}` : ""}
              </span>
              <div className="bento-figure money">
                {primaryMoney
                  ? formatMoney(
                      primaryMoney.outstanding === 0 && primaryMoney.billed > 0
                        ? primaryMoney.received
                        : primaryMoney.outstanding,
                      primary,
                      locale
                    )
                  : formatMoney(0, "IDR", locale)}
              </div>
              <p className="bento-note">
                {primaryMoney
                  ? `${t("dashboard.moneyBilled")}: ${formatMoney(primaryMoney.billed, primary, locale)}`
                  : t("dashboard.moneyEmpty")}
              </p>
              <div className="bento-actions">
                <Link href="/dashboard/new-invoice" className="btn btn-primary">
                  {t("nav.createInvoice")}
                </Link>
                <button type="button" className="btn btn-ghost" onClick={() => setTab("invoices")}>
                  {t("dashboard.tabInvoices")}
                </button>
              </div>
            </section>

            <section className="bento-card bento-recv">
              <span className="bento-label">{t("dashboard.moneyReceived")}</span>
              <div className="bento-sub money text-ok">
                {primaryMoney ? formatMoney(primaryMoney.received, primary, locale) : "—"}
              </div>
              <p className="hint">{stats.paid} {t("dashboard.filterPaid").toLowerCase()}</p>
            </section>

            <section className="bento-card bento-await">
              <span className="bento-label">{t("dashboard.moneyOutstanding")}</span>
              <div className="bento-sub money" style={{ color: "var(--warn)" }}>
                {primaryMoney ? formatMoney(primaryMoney.outstanding, primary, locale) : "—"}
              </div>
              <p className="hint">{stats.unpaid + stats.awaiting} {t("dashboard.filterUnpaid").toLowerCase()}</p>
            </section>

            {/* Seven days of real billing. Empty days stay empty. */}
            <section className="bento-card bento-chart">
              <span className="bento-label">{t("dashboard.chartTitle")}</span>
              <div className="bars">
                {perDay.map(({ day, total }) => (
                  <div className="bar-col" key={day.toISOString()}>
                    <div
                      className={`bar${total > 0 ? " bar-on" : ""}`}
                      style={{ height: `${Math.max((total / peak) * 100, 3)}%` }}
                      title={formatMoney(total, primary ?? "IDR", locale)}
                    />
                    <span>{day.toLocaleDateString(locale, { weekday: "narrow" })}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bento-card bento-donut">
              <span className="bento-label">{t("dashboard.splitTitle")}</span>
              <div className="donut-wrap">
                <div
                  className="donut"
                  style={{ background: split.length ? `conic-gradient(${donut})` : "var(--line)" }}
                >
                  <span>{stats.total}</span>
                </div>
                <ul className="donut-key">
                  <li><i style={{ background: "var(--success)" }} />{t("dashboard.filterPaid")} <b>{stats.paid}</b></li>
                  <li><i style={{ background: "var(--warn)" }} />{t("dashboard.filterAwaiting")} <b>{stats.awaiting}</b></li>
                  <li><i style={{ background: "var(--primary)" }} />{t("dashboard.filterUnpaid")} <b>{stats.unpaid}</b></li>
                </ul>
              </div>
            </section>

            {/* The wallet column: credits, plan, and the last movements. */}
            <aside className="bento-side">
              <div className="side-credits">
                <span className="bento-label">{t("dashboard.credit")}</span>
                <div className="bento-figure">{profile.free_invoice_credits}</div>
                <p className="hint">{t("dashboard.creditIsInvoice")}</p>
                {profile.plan === "free" && (
                  <div className="side-plan">
                    <button className="btn btn-ghost" onClick={() => setUpgradePlan("starter")}>
                      Starter
                    </button>
                    <button className="btn btn-primary" onClick={() => setUpgradePlan("pro")}>
                      Pro
                    </button>
                  </div>
                )}
              </div>

              <div className="side-ledger">
                <span className="bento-label">{t("dashboard.creditHistory")}</span>
                {ledger.length === 0 ? (
                  <p className="empty">{t("dashboard.creditHistoryEmpty")}</p>
                ) : (
                  <div className="ledger-list">
                    {ledger.slice(0, 6).map((entry) => (
                      <div className="ledger-row" key={`${entry.created_at}-${entry.amount}-${entry.type}`}>
                        <span className={entry.amount > 0 ? "ledger-plus" : "ledger-minus"}>
                          {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                        </span>
                        <span className="ledger-ref">{entry.reference}</span>
                        <span className="hint">{formatDateShort(entry.created_at, locale)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" className="link-btn side-more" onClick={() => setTab("loop")}>
                  {t("dashboard.seeAll")}
                </button>
              </div>
            </aside>
          </div>
        )}

        {tab === "invoices" && (
          <>
            <h2 className="section-title" style={{ marginTop: 0 }}>{t("dashboard.invoiceList")}</h2>
            {invoiceList}
          </>
        )}

        {tab === "loop" && (
          <>
            <h2 className="section-title" style={{ marginTop: 0 }}>{t("dashboard.growthTitle")}</h2>
            <div className="stat-grid">
              <Stat label={t("dashboard.views")} value={stats.total_views.toString()} />
              <Stat label={t("dashboard.clicks")} value={stats.total_clicks.toString()} />
              <Stat label={t("dashboard.referrals")} value={stats.signups.toString()} />
              <Stat label={t("dashboard.conversion")} value={stats.total_views > 0 ? `${stats.conversion}%` : "0"} />
              <Stat label={t("dashboard.creditsEarned")} value={stats.credits_earned.toString()} />
              <Stat label={t("dashboard.credit")} value={profile.free_invoice_credits.toString()} />
            </div>

            <div className="card-panel dash-block">
              <h2 className="section-title" style={{ marginTop: 0 }}>{t("dashboard.referralSection")}</h2>
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
              <p className="hint" style={{ marginTop: 0 }}>{t("dashboard.referralCodeHint")}</p>
              {referrals.length === 0 ? (
                <p className="empty">{t("dashboard.referralEmpty")}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {referrals.map((ref) => (
                    <div key={ref.id} className="list-item">
                      <span>{ref.referred?.full_name || ref.referred?.email || t("dashboard.newUser")}</span>
                      <span className="side">
                        <span className="badge badge-paid">+{ref.reward_credits} {t("dashboard.credits")}</span>
                        <span className="hint">{formatDateShort(ref.created_at, locale)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-panel dash-block">
              <h2 className="section-title" style={{ marginTop: 0 }}>{t("dashboard.creditHistory")}</h2>
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
                      <span className="hint">{formatDateShort(entry.created_at, locale)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {profile.email.endsWith("@involoop.app") && (
              <div className="card-panel demo-reset dash-block">
                <div>
                  <h2 className="section-title" style={{ marginTop: 0 }}>{t("dashboard.demoWorkspace")}</h2>
                  <p className="hint">{t("dashboard.demoWorkspaceHint")}</p>
                </div>
                <button className="btn btn-ghost" onClick={handleResetDemo} disabled={resetting}>
                  {resetting ? t("dashboard.resetting") : t("dashboard.resetWorkspace")}
                </button>
              </div>
            )}

            <details className="card-panel dash-block" style={{ padding: 0 }}>
              <summary style={{ cursor: "pointer", padding: "16px 20px", fontWeight: 600, fontSize: 15 }}>
                {t("dashboard.paymentSettings")}
                <span className="hint" style={{ marginLeft: 10 }}>
                  {paypalReady ? t("dashboard.connected") : t("dashboard.notConnected")}
                </span>
              </summary>
              <div style={{ padding: "0 20px 16px" }}>
                <div className="settings-rows">
                  <div className="settings-row">
                    <span>{t("dashboard.provider")}</span>
                    <strong>PayPal</strong>
                  </div>
                  <div className="settings-row">
                    <span>{t("dashboard.payoutAddress")}</span>
                    <strong className={paypalReady ? "text-ok" : ""}>
                      {profile.paypal_email ?? t("dashboard.notConnected")}
                    </strong>
                  </div>
                  <div className="settings-row">
                    <span>{t("dashboard.mode")}</span>
                    <strong>{t("dashboard.testMode")}</strong>
                  </div>
                  <div className="settings-row">
                    <span>{t("dashboard.defaultCurrency")}</span>
                    <strong>{currencies[0] ?? "IDR"}</strong>
                  </div>
                </div>
                <p className="test-badge" style={{ marginTop: 14 }}>{t("dashboard.sandboxBadge")}</p>
                {paypalReady && <p className="hint">{t("dashboard.setupDone")}</p>}
              </div>
            </details>
          </>
        )}
      </main>

      <UpgradeModal
        plan={upgradePlan}
        lang={lang}
        onClose={() => setUpgradePlan(null)}
        onPaid={(plan) => {
          setUpgradePlan(null);
          setUpgraded(true);
          load();
        }}
      />

      <InvoiceModal
        invoice={openInvoice}
        lang={lang}
        onClose={() => openInvoiceModal(null)}
        onUpdated={applyInvoiceUpdate}
        onDeleted={applyInvoiceDelete}
      />

      {flash && (
        <motion.div
          className="toast"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          role="status"
        >
          {flash}
        </motion.div>
      )}
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


