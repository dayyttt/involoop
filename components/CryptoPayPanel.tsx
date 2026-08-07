"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

// Paying in USDC, for someone who has probably never done it.
//
// Both directions use this: a client paying an invoice, and a user buying a
// plan. The only thing that changes is what is being bought.
//
// Three things confuse a first-timer, and all three are answered here before
// they are hit rather than after: why nothing has happened yet, why USDC needs
// SOL for fees, and which network this is — because sending on the wrong one
// cannot be undone by anyone, including us.

export interface CryptoRequest {
  reference: string;
  url: string;
  qr: string;
  amount: string;
  recipient: string;
  network: string;
  expiresAt: string;
}

type Stage = "loading" | "awaiting_payment" | "detected" | "verifying" | "confirmed" | "expired" | "error";

export interface CryptoLabels {
  loading: string;
  amountLabel: string;
  networkLabel: string;
  recipientLabel: string;
  openWallet: string;
  copyAmount: string;
  copyAddress: string;
  copied: string;
  scanHint: string;
  feesHint: string;
  exactHint: string;
  waiting: string;
  detected: string;
  verifying: string;
  confirmed: string;
  expired: string;
  retry: string;
  viewTx: string;
}

export default function CryptoPayPanel({
  create,
  labels,
  onConfirmed,
}: {
  /** Asks the server to make the request. The amount and recipient come from
      the database; nothing here decides what is owed. */
  create: () => Promise<CryptoRequest>;
  labels: CryptoLabels;
  onConfirmed: (signature: string | null) => void;
}) {
  const [request, setRequest] = useState<CryptoRequest | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string | null>(null);
  const [explorer, setExplorer] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);

  const start = useCallback(async () => {
    setStage("loading");
    setError(null);
    try {
      const made = await create();
      setRequest(made);
      setStage("awaiting_payment");
    } catch (err: any) {
      setError(err?.message ?? "Could not start the payment.");
      setStage("error");
    }
  }, [create]);

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling is the same server work the webhook triggers, so a payment settles
  // whether or not a notification ever arrives. Every three seconds is often
  // enough to feel immediate and rare enough not to hammer the RPC.
  useEffect(() => {
    if (!request || done.current) return;
    if (stage === "confirmed" || stage === "expired" || stage === "error") return;

    async function poll() {
      try {
        const res = await fetch(
          `/api/payments/crypto/status?reference=${encodeURIComponent(request!.reference)}`
        );
        const body = await res.json();
        if (done.current) return;

        if (body.status === "confirmed") {
          done.current = true;
          setStage("confirmed");
          setExplorer(body.explorer ?? null);
          onConfirmed(body.signature ?? null);
          return;
        }
        if (body.status === "expired") {
          setStage("expired");
          return;
        }
        if (body.status === "detected" || body.status === "verifying") {
          setStage(body.status);
        }
      } catch {
        // A failed poll is not a failed payment. Stay quiet and try again.
      }
      timer.current = setTimeout(poll, 3000);
    }

    timer.current = setTimeout(poll, 2000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [request, stage, onConfirmed]);

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard refused; the value is on screen to read */
    }
  }

  if (stage === "loading") {
    return (
      <div className="crypto-panel">
        <div className="skel skel-card" />
        <p className="hint" style={{ textAlign: "center" }}>{labels.loading}</p>
      </div>
    );
  }

  if (stage === "error" || !request) {
    return (
      <div className="crypto-panel">
        <p className="error" style={{ margin: 0 }}>{error}</p>
        <button className="btn btn-ghost" onClick={start}>{labels.retry}</button>
      </div>
    );
  }

  if (stage === "confirmed") {
    return (
      <motion.div
        className="crypto-panel crypto-done"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <strong>{labels.confirmed}</strong>
        {explorer && (
          <a className="link-btn" href={explorer} target="_blank" rel="noreferrer">
            {labels.viewTx}
          </a>
        )}
      </motion.div>
    );
  }

  if (stage === "expired") {
    return (
      <div className="crypto-panel">
        <p className="modal-locked" style={{ margin: 0 }}>{labels.expired}</p>
        <button className="btn btn-ghost" onClick={start}>{labels.retry}</button>
      </div>
    );
  }

  const isDevnet = request.network.includes("devnet");

  return (
    <div className="crypto-panel">
      {/* The network, first and unmissable. Sending on the wrong one is the
          single mistake nobody can reverse. */}
      <div className={`crypto-network ${isDevnet ? "is-test" : ""}`}>
        {labels.networkLabel}: <strong>{isDevnet ? "Solana Devnet" : "Solana"}</strong>
      </div>

      {request.qr && (
        <div className="crypto-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={request.qr} alt="" width={200} height={200} />
          <p className="hint">{labels.scanHint}</p>
        </div>
      )}

      <div className="crypto-rows">
        <div className="crypto-row">
          <span>{labels.amountLabel}</span>
          <button type="button" className="crypto-copy" onClick={() => copy(request.amount, "amount")}>
            <strong>{request.amount} USDC</strong>
            <span className="hint">{copied === "amount" ? labels.copied : labels.copyAmount}</span>
          </button>
        </div>
        <div className="crypto-row">
          <span>{labels.recipientLabel}</span>
          <button type="button" className="crypto-copy" onClick={() => copy(request.recipient, "addr")}>
            <code className="mono">{request.recipient.slice(0, 6)}…{request.recipient.slice(-6)}</code>
            <span className="hint">{copied === "addr" ? labels.copied : labels.copyAddress}</span>
          </button>
        </div>
      </div>

      <a className="btn btn-primary btn-mobile-full" href={request.url}>
        {labels.openWallet}
      </a>

      <p className="hint crypto-note">{labels.exactHint}</p>
      <p className="hint crypto-note">{labels.feesHint}</p>

      {/* Honest progress. A spinner with no words is how someone concludes the
          payment is stuck and sends it a second time. */}
      <div className="crypto-progress" aria-live="polite">
        <span className={stage !== "awaiting_payment" ? "is-done" : "is-active"}>{labels.waiting}</span>
        <span className={stage === "verifying" ? "is-active" : stage === "detected" ? "is-active" : ""}>
          {stage === "verifying" ? labels.verifying : labels.detected}
        </span>
      </div>
    </div>
  );
}
