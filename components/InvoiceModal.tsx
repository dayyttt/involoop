"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  formatMoney,
  formatDateShort,
  currencyDecimals,
  SUPPORTED_CURRENCIES,
  CURRENCY_LABELS,
} from "@/lib/money";
import { appText, type Lang } from "@/lib/i18n";
import StatusBadge from "@/components/StatusBadge";

export interface ModalInvoice {
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

// The invoice a freelancer sent, opened without leaving the dashboard.
//
// Two things decide the whole design here. First, an invoice is not a row in a
// table — it is a document someone is waiting to be paid for, so the modal
// leads with the money and the client, not with metadata. Second, editing is
// only honest while nobody has acted on the invoice: once a client has paid or
// confirmed a transfer, the figure is a record, not a draft. The lock is
// enforced in the database; this component only explains it.
export default function InvoiceModal({
  invoice,
  lang,
  onClose,
  onUpdated,
  onDeleted,
}: {
  invoice: ModalInvoice | null;
  lang: Lang;
  onClose: () => void;
  onUpdated: (next: ModalInvoice) => void;
  onDeleted: (publicId: string) => void;
}) {
  const t = (k: string) => appText(lang, k);
  const locale = lang === "id" ? "id-ID" : "en-US";
  const reduced = useReducedMotion();

  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [detail, setDetail] = useState<ModalInvoice | null>(invoice);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    client_name: "",
    description: "",
    amount: "",
    currency: "USD",
    due_date: "",
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const open = !!invoice;
  const editable = detail?.status === "unpaid";
  const deletable = detail?.status !== "paid";

  // Reset every time a different invoice is opened, so state from the last one
  // never leaks into this one.
  useEffect(() => {
    if (!invoice) return;
    setDetail(invoice);
    setMode("view");
    setError(null);
    setSaved(false);
    restoreFocus.current = document.activeElement as HTMLElement;

    // The list payload may predate migration-p3 and carry no description or due
    // date. Rather than show an empty modal, fill it from the invoice endpoint —
    // the header the person already sees stays put while this lands.
    if (invoice.description === undefined) {
      fetch(`/api/invoices/${invoice.public_id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data?.invoice) return;
          setDetail((prev) =>
            prev && prev.public_id === invoice.public_id
              ? {
                  ...prev,
                  description: data.invoice.description,
                  due_date: data.invoice.due_date,
                  cta_message: data.invoice.cta_message,
                }
              : prev
          );
        })
        .catch(() => {
          /* the header is still useful without it */
        });
    }
  }, [invoice]);

  // Escape backs out one layer at a time: out of a destructive confirmation
  // first, then out of editing, and only then out of the invoice.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (mode === "confirm-delete") setMode("view");
      else if (mode === "edit") setMode("view");
      else onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, mode, onClose]);

  // Hold the page still behind the dialog.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      restoreFocus.current?.focus?.();
    };
  }, [open]);

  function startEdit() {
    if (!detail) return;
    setForm({
      client_name: detail.client_name,
      description: detail.description ?? "",
      amount: String(detail.amount),
      currency: detail.currency,
      due_date: detail.due_date ? detail.due_date.slice(0, 10) : "",
    });
    setError(null);
    setMode("edit");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/invoices/${detail.public_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: form.client_name,
        description: form.description,
        amount: Number(form.amount),
        currency: form.currency,
        due_date: form.due_date || null,
        lang,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? t("dashboard.loadFailed"));
      return;
    }
    const next: ModalInvoice = {
      ...detail,
      client_name: data.invoice.client_name,
      description: data.invoice.description,
      amount: Number(data.invoice.amount),
      currency: data.invoice.currency,
      due_date: data.invoice.due_date,
    };
    setDetail(next);
    onUpdated(next);
    setMode("view");
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  }

  async function remove() {
    if (!detail) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/invoices/${detail.public_id}?lang=${lang}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? t("dashboard.loadFailed"));
      setMode("view");
      return;
    }
    onDeleted(detail.public_id);
    onClose();
  }

  async function copyLink() {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/invoice/${detail.public_id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("dashboard.copyFailed"));
    }
  }

  // What the client will read, computed from what is being typed right now.
  const previewAmount = (() => {
    const n = Number(form.amount);
    if (!Number.isFinite(n) || n <= 0) return null;
    return formatMoney(n, form.currency, locale);
  })();

  const dur = reduced ? 0 : 0.22;

  return (
    <AnimatePresence>
      {open && detail && (
        <motion.div
          className="modal-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`${t("dashboard.detailTitle")} ${detail.number}`}
            className="modal-panel"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: dur, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <header className="modal-head">
              <div>
                <span className="invoice-label">{detail.number}</span>
                <h2 className="modal-title">{detail.client_name}</h2>
              </div>
              <div className="side" style={{ gap: 8 }}>
                <StatusBadge status={detail.status} lang={lang} />
                <button
                  type="button"
                  className="modal-close"
                  onClick={onClose}
                  aria-label={t("dashboard.detailClose")}
                >
                  ×
                </button>
              </div>
            </header>

            <div className="modal-body">
              {mode === "edit" ? (
                <form onSubmit={save} className="modal-form">
                  <div className="field">
                    <label htmlFor="m-client">{t("dashboard.detailClient")}</label>
                    <input
                      id="m-client"
                      className="input"
                      value={form.client_name}
                      maxLength={80}
                      onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="m-desc">{t("dashboard.detailDescription")}</label>
                    <textarea
                      id="m-desc"
                      className="input"
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="modal-grid">
                    <div className="field">
                      <label htmlFor="m-amount">{t("dashboard.detailAmount")}</label>
                      <input
                        id="m-amount"
                        className="input"
                        type="number"
                        min="0"
                        step={currencyDecimals(form.currency) === 0 ? "1" : "0.01"}
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="m-currency">{t("dashboard.detailCurrency")}</label>
                      <select
                        id="m-currency"
                        className="input"
                        value={form.currency}
                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      >
                        {SUPPORTED_CURRENCIES.map((code) => (
                          <option key={code} value={code}>
                            {CURRENCY_LABELS[code] ?? code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="m-due">{t("dashboard.detailDue")}</label>
                    <input
                      id="m-due"
                      className="input"
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </div>

                  {/* The figure exactly as the client will read it, updating
                      while it is typed — so nobody publishes 3000 meaning 3,000.00. */}
                  {previewAmount && (
                    <div className="modal-preview">
                      <span className="invoice-label">{t("dashboard.detailAmount")}</span>
                      <strong>{previewAmount}</strong>
                    </div>
                  )}

                  {error && <p className="error" style={{ margin: 0 }}>{error}</p>}

                  <div className="modal-actions">
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      {busy ? t("dashboard.detailSaving") : t("dashboard.detailSave")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setMode("view")}
                      disabled={busy}
                    >
                      {t("dashboard.detailCancel")}
                    </button>
                  </div>
                </form>
              ) : mode === "confirm-delete" ? (
                <div className="modal-danger">
                  <h3 className="modal-danger-title">{t("dashboard.detailDeleteAsk")}</h3>
                  <p className="hint">{t("dashboard.detailDeleteBody")}</p>
                  <p className="hint">{t("dashboard.detailDeleteCredit")}</p>
                  {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
                  <div className="modal-actions">
                    <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
                      {busy ? t("dashboard.detailDeleting") : t("dashboard.detailDeleteConfirm")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setMode("view")}
                      disabled={busy}
                    >
                      {t("dashboard.detailCancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="modal-money">
                    <span className="invoice-label">{t("dashboard.detailAmount")}</span>
                    <strong>{formatMoney(detail.amount, detail.currency, locale)}</strong>
                    <span className="hint">
                      {detail.due_date
                        ? `${t("dashboard.detailDue")} · ${formatDateShort(detail.due_date, locale)}`
                        : t("dashboard.detailNoDue")}
                    </span>
                  </div>

                  {/* No "billed to" row: the client's name is already the
                      heading of this dialog, and repeating it just pushes the
                      description further down. */}
                  <div className="modal-rows">
                    <div className="settings-row">
                      <span>{t("dashboard.detailWork")}</span>
                      <strong className="modal-desc">
                        {detail.description ?? <span className="skel skel-line" />}
                      </strong>
                    </div>
                    <div className="settings-row">
                      <span>{t("dashboard.detailIssued")}</span>
                      <strong>{formatDateShort(detail.created_at, locale)}</strong>
                    </div>
                  </div>

                  {/* Distribution, per invoice: this is the product's whole
                      argument, so it belongs on the document itself. */}
                  <div className="modal-stats">
                    <div>
                      <strong>{detail.views}</strong>
                      <span>{t("dashboard.views")}</span>
                    </div>
                    <div>
                      <strong>{detail.referral_clicks ?? 0}</strong>
                      <span>{t("dashboard.detailClicks")}</span>
                    </div>
                  </div>

                  {detail.cta_message && (
                    <div className="modal-cta">
                      <span className="invoice-label">{t("dashboard.detailReferralLine")}</span>
                      <p>{detail.cta_message}</p>
                    </div>
                  )}

                  {!editable && (
                    <p className="modal-locked">
                      {detail.status === "paid"
                        ? t("dashboard.detailLockedPaid")
                        : t("dashboard.detailLockedActive")}
                    </p>
                  )}

                  {error && <p className="error" style={{ margin: 0 }}>{error}</p>}

                  <div className="modal-actions modal-actions-wrap">
                    <a
                      className="btn btn-ghost"
                      href={`/invoice/${detail.public_id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("dashboard.detailOpenPublic")}
                    </a>
                    <a
                      className="btn btn-ghost"
                      href={`/invoice/${detail.public_id}/pdf?lang=${lang}`}
                      download
                    >
                      {t("dashboard.detailPdf")}
                    </a>
                    <button type="button" className="btn btn-ghost" onClick={copyLink}>
                      {copied ? t("common.copied") : t("common.copyLink")}
                    </button>
                    {editable && (
                      <button type="button" className="btn btn-primary" onClick={startEdit}>
                        {t("dashboard.detailEdit")}
                      </button>
                    )}
                    {deletable && (
                      <button
                        type="button"
                        className="btn btn-quiet-danger"
                        onClick={() => setMode("confirm-delete")}
                      >
                        {t("dashboard.detailDelete")}
                      </button>
                    )}
                  </div>

                  {saved && <p className="text-ok" style={{ fontSize: 13, margin: 0 }}>{t("dashboard.detailSaved")}</p>}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
