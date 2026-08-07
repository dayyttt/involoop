"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { appText, type Lang } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";
import LangToggle from "@/components/LangToggle";
import { formatDate } from "@/lib/money";
import WalletConnect from "@/components/WalletConnect";

interface Profile {
  email: string;
  full_name: string | null;
  referral_code: string;
  plan?: string;
  free_invoice_credits: number;
  paypal_email: string | null;
  solana_wallet: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const supabase = createClient();
  const lang: Lang = useLang();
  const t = (k: string) => appText(lang, k);
  const locale = lang === "id" ? "id-ID" : "en-US";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [paypal, setPaypal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.profile) return;
        setProfile(data.profile);
        setName(data.profile.full_name ?? "");
        setPaypal(data.profile.paypal_email ?? "");
      })
      .catch(() => setError(t("profile.loadFailed")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name, paypal_email: paypal, lang }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? t("profile.saveFailed"));
      return;
    }
    setProfile((p) =>
      p ? { ...p, full_name: data.profile.full_name, paypal_email: data.profile.paypal_email } : p
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwDone(false);
    if (password.length < 6) {
      setPwError(t("signup.shortPassword"));
      return;
    }
    setPwSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPwSaving(false);
    if (updateError) {
      setPwError(t("profile.passwordFailed"));
      return;
    }
    setPassword("");
    setPwDone(true);
    setTimeout(() => setPwDone(false), 2600);
  }

  const shown = (name.trim() || profile?.full_name || "").trim();

  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <LangToggle />
          <Link href="/dashboard" className="btn btn-ghost">
            {t("common.back")}
          </Link>
        </div>
      </nav>

      <main className="page-shell" style={{ maxWidth: 720 }}>
        <h1 className="page-title" style={{ marginBottom: 4 }}>{t("profile.title")}</h1>
        <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>{t("profile.sub")}</p>

        {!profile ? (
          <div className="card-panel">
            <div className="skel skel-line" />
            <div className="skel skel-row" />
          </div>
        ) : (
          <>
            <div className="card-panel">
              <h2 className="section-title" style={{ marginTop: 0 }}>{t("profile.nameTitle")}</h2>
              <p className="hint" style={{ marginTop: 0 }}>{t("profile.nameHint")}</p>

              <form onSubmit={saveName} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="field">
                  <label htmlFor="full-name">{t("profile.nameLabel")}</label>
                  <input
                    id="full-name"
                    className="input"
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("signup.fullNamePlaceholder")}
                    required
                  />
                </div>

                {/* Shows the change where it actually lands, so nobody has to
                    publish an invoice to find out how their name will look. */}
                <div className="letterhead">
                  <span className="invoice-label">{t("profile.previewLabel")}</span>
                  <strong>{shown || t("profile.previewEmpty")}</strong>
                  <span className="hint">INVOICE · INV-2026-000</span>
                </div>

                {/* Where the money actually arrives. Involoop never holds it:
                    the invoice is addressed to this account, so a client paying
                    with PayPal pays the freelancer directly. */}
                <div className="field" id="paypal">
                  <label htmlFor="paypal-email">{t("profile.paypalLabel")}</label>
                  <input
                    id="paypal-email"
                    className="input"
                    type="email"
                    value={paypal}
                    onChange={(e) => setPaypal(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  <p className="hint" style={{ marginTop: 6 }}>
                    {paypal.trim() ? t("profile.paypalOn") : t("profile.paypalOff")}
                  </p>
                </div>

                <div className="side" style={{ gap: 10, flexWrap: "wrap" }}>
                  <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
                    {saving ? t("profile.saving") : t("profile.save")}
                  </button>
                  {saved && <span className="text-ok" style={{ fontSize: 13 }}>{t("profile.saved")}</span>}
                </div>
                {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
              </form>
            </div>

            {/* Where a client's USDC lands. Separate card from the PayPal
                address because they are separate rails and a freelancer may
                well want one and not the other. */}
            <div className="card-panel dash-block">
              <h2 className="section-title" style={{ marginTop: 0 }}>{t("profile.walletTitle")}</h2>
              <p className="hint" style={{ marginTop: 0 }}>{t("profile.walletHint")}</p>
              <WalletConnect
                current={profile.solana_wallet}
                labels={{
                  connect: t("profile.walletConnect"),
                  change: t("profile.walletChange"),
                  connecting: t("profile.walletConnecting"),
                  noWallet: t("profile.walletNone"),
                  connected: t("profile.walletConnected"),
                  warning: t("profile.walletWarning"),
                }}
                onConnected={(wallet) =>
                  setProfile((p) => (p ? { ...p, solana_wallet: wallet } : p))
                }
              />
            </div>

            <div className="card-panel dash-block">
              <h2 className="section-title" style={{ marginTop: 0 }}>{t("profile.accountTitle")}</h2>
              <div className="settings-rows">
                <div className="settings-row">
                  <span>{t("profile.email")}</span>
                  <strong>{profile.email}</strong>
                </div>
                <div className="settings-row">
                  <span>{t("dashboard.currentPlan")}</span>
                  <strong>{profile.plan === "pro" ? "Pro" : profile.plan === "starter" ? "Starter" : t("dashboard.planFree")}</strong>
                </div>
                <div className="settings-row">
                  <span>{t("dashboard.credit")}</span>
                  <strong>{profile.free_invoice_credits}</strong>
                </div>
                <div className="settings-row">
                  <span>{t("profile.joined")}</span>
                  <strong>{formatDate(profile.created_at, locale)}</strong>
                </div>
              </div>
              <p className="hint" style={{ marginBottom: 0 }}>{t("profile.emailHint")}</p>
            </div>

            <div className="card-panel dash-block">
              <h2 className="section-title" style={{ marginTop: 0 }}>{t("profile.passwordTitle")}</h2>
              <form onSubmit={savePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="field">
                  <label htmlFor="new-password">{t("profile.passwordLabel")}</label>
                  <input
                    id="new-password"
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("signup.passwordPlaceholder")}
                    autoComplete="new-password"
                  />
                </div>
                <div className="side" style={{ gap: 10, flexWrap: "wrap" }}>
                  <button type="submit" className="btn btn-ghost" disabled={pwSaving || !password}>
                    {pwSaving ? t("profile.saving") : t("profile.passwordSave")}
                  </button>
                  {pwDone && <span className="text-ok" style={{ fontSize: 13 }}>{t("profile.passwordDone")}</span>}
                </div>
                {pwError && <p className="error" style={{ margin: 0 }}>{pwError}</p>}
              </form>
            </div>
          </>
        )}
      </main>
    </>
  );
}
