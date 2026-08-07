"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import PayPalButtons from "@/components/PayPalButtons";
import { appText, type Lang } from "@/lib/i18n";

export type UpgradePlan = "starter" | "pro";

const PRICE: Record<UpgradePlan, { label: string; usd: string; invoices: string }> = {
  starter: { label: "Starter", usd: "$3", invoices: "10" },
  pro: { label: "Pro", usd: "$8", invoices: "50" },
};

// Buying a plan without leaving the page you were reading about it on.
//
// The same buttons as an invoice payment, for the same reason: someone without
// a PayPal account can still pay by card, and Involoop still never touches the
// card itself.
export default function UpgradeModal({
  plan,
  lang,
  onClose,
  onPaid,
}: {
  plan: UpgradePlan | null;
  lang: Lang;
  onClose: () => void;
  onPaid: (plan: UpgradePlan) => void;
}) {
  const t = (k: string) => appText(lang, k);
  const reduced = useReducedMotion();
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!plan) return;
    setError(null);
    restoreFocus.current = document.activeElement as HTMLElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      restoreFocus.current?.focus?.();
    };
  }, [plan, onClose]);

  async function createPlanOrder(): Promise<string> {
    setError(null);
    const res = await fetch("/api/payments/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, lang }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) {
      const message = data.error ?? t("dashboard.upgradeFailed");
      setError(message);
      throw new Error(message);
    }
    return data.id;
  }

  const dur = reduced ? 0 : 0.22;
  const info = plan ? PRICE[plan] : null;

  return (
    <AnimatePresence>
      {plan && info && (
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
            aria-label={`${t("dashboard.upgradeTitle")} ${info.label}`}
            className="modal-panel modal-panel-sm"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: dur, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <header className="modal-head">
              <div>
                <span className="invoice-label">{t("dashboard.upgradeTitle")}</span>
                <h2 className="modal-title">Involoop {info.label}</h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={onClose}
                aria-label={t("dashboard.detailClose")}
              >
                ×
              </button>
            </header>

            <div className="modal-body">
              <div className="modal-money">
                <span className="invoice-label">{t("dashboard.upgradePrice")}</span>
                <strong>{info.usd}</strong>
                <span className="hint">
                  {t("dashboard.upgradeIncludes").replace("{n}", info.invoices)}
                </span>
              </div>

              <PayPalButtons
                currency="USD"
                lang={lang}
                createOrder={createPlanOrder}
                onApproved={() => onPaid(plan)}
                onError={(message) => setError(message)}
                labelLoading={t("invoice.payLoading")}
                labelUnavailable={t("invoice.payUnavailable")}
                labelDeclined={t("invoice.payDeclined")}
                labelPending={t("invoice.payPending")}
              />

              {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
              <p className="test-badge" style={{ margin: 0, textAlign: "center" }}>
                {t("dashboard.sandboxBadge")}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
