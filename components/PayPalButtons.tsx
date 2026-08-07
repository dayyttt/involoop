"use client";

import { useEffect, useRef, useState } from "react";

// PayPal's own buttons, rendered on the page instead of sending the client to
// another domain and hoping they come back.
//
// This is what buys the card option: the SDK renders a PayPal button and a
// "Debit or Credit Card" button from the same order, so someone without a
// PayPal account can still pay. Building a card form ourselves would mean
// touching card numbers, which is the one thing an invoicing app should never
// do.
//
// The SDK is loaded per currency because the script URL carries it, and an
// order in MYR rendered by a USD-loaded SDK is rejected at approval time.

declare global {
  interface Window {
    paypal?: any;
  }
}

const SCRIPT_ID = "paypal-sdk";

function loadSdk(currency: string, locale: string): Promise<any> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) return Promise.reject(new Error("PAYPAL_CLIENT_ID_MISSING"));

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  // Already loaded for this exact currency: reuse it.
  if (
    existing &&
    existing.dataset.currency === currency &&
    existing.dataset.locale === locale &&
    window.paypal
  ) {
    return Promise.resolve(window.paypal);
  }
  // Loaded for a different currency: the SDK cannot be reconfigured in place,
  // so the old script and its global are removed first.
  if (existing) {
    existing.remove();
    delete window.paypal;
  }

  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      "client-id": clientId,
      currency,
      locale,
      intent: "capture",
      components: "buttons",
      "enable-funding": "card",
      "disable-funding": "paylater,credit",
    });
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.async = true;
    script.dataset.currency = currency;
    script.dataset.locale = locale;
    script.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("SDK_NO_GLOBAL")));
    script.onerror = () => reject(new Error("SDK_LOAD_FAILED"));
    document.body.appendChild(script);
  });
}

export default function PayPalButtons({
  currency,
  lang,
  createOrder,
  onApproved,
  onError,
  labelLoading,
  labelUnavailable,
  labelDeclined,
  labelPending,
  disabled,
}: {
  currency: string;
  /** Page language, so the buttons do not speak a different one than the copy. */
  lang: "en" | "id";
  /** Creates the order server-side and resolves to its PayPal id. */
  createOrder: () => Promise<string>;
  /** Runs after the capture call succeeds. */
  onApproved: (orderId: string) => void | Promise<void>;
  onError: (message: string) => void;
  labelLoading: string;
  labelUnavailable: string;
  /** Shown when a card is declined and the buyer is sent back to choose again. */
  labelDeclined: string;
  /** Shown when PayPal accepted the order but the capture has not completed. */
  labelPending: string;
  disabled?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  // Handlers are read through a ref so re-renders of the parent never force the
  // buttons to be torn down and rebuilt — that flashes an empty box mid-payment.
  const handlers = useRef({ createOrder, onApproved, onError });
  handlers.current = { createOrder, onApproved, onError };

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    const locale = lang === "id" ? "id_ID" : "en_US";
    const declinedLabel = labelDeclined;
    const pendingLabel = labelPending;

    loadSdk(currency, locale)
      .then((paypal) => {
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = "";

        paypal
          .Buttons({
            style: { layout: "vertical", shape: "rect", height: 46, label: "pay" },
            createOrder: () => handlers.current.createOrder(),
            onApprove: async (data: { orderID: string }, actions: any) => {
              const res = await fetch("/api/payments/capture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderID: data.orderID }),
              });
              const body = await res.json().catch(() => ({}));
              // Card declined. PayPal's documented handling is to restart the
              // same order so the buyer can pick another funding source; the
              // alternative is telling someone their payment failed when all
              // that happened is one card said no.
              if (body.restart) {
                handlers.current.onError(declinedLabel);
                return actions.restart();
              }
              if (!res.ok) {
                handlers.current.onError(body.error ?? "Payment could not be completed.");
                return;
              }
              // A 200 only means the request worked. PayPal can accept an order
              // without the capture completing, and treating that as paid is how
              // someone ends up reading "Payment successful" over money that
              // never moved.
              if (body.paid !== true) {
                handlers.current.onError(pendingLabel);
                return;
              }
              await handlers.current.onApproved(data.orderID);
            },
            onError: (err: unknown) => {
              console.error("paypal buttons error", err);
              handlers.current.onError("Payment could not be completed.");
            },
            // Closing the PayPal window is a decision, not a failure. Saying
            // nothing here keeps the page from accusing the client of an error
            // they did not make.
            onCancel: () => {},
          })
          .render(hostRef.current)
          .then(() => !cancelled && setState("ready"))
          .catch(() => !cancelled && setState("failed"));
      })
      .catch((err) => {
        console.error("paypal sdk load failed", err?.message ?? err);
        if (!cancelled) setState("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [currency, lang]);

  return (
    // The mount is never display:none and never renamed to anything starting
    // with "paypal-": the SDK measures this element's width to lay the buttons
    // out, so hiding it renders them at zero width, and its own internal class
    // names include .paypal-buttons, which our styles would otherwise capture.
    <div className={`pp-slot ${disabled ? "is-disabled" : ""}`}>
      <div ref={hostRef} className="pp-mount" />
      {state === "loading" && (
        <div className="pp-skeleton" aria-live="polite">
          <span className="skel skel-btn" />
          <span className="skel skel-btn" />
          <span className="hint">{labelLoading}</span>
        </div>
      )}
      {state === "failed" && <p className="hint pp-failed">{labelUnavailable}</p>}
    </div>
  );
}
