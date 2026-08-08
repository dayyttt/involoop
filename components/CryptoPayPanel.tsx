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
  amountMinor?: number;
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
  scanHint: string;
  manualWarn: string;
  sentTitle: string;
  sentBody: string;
  feesHint: string;
  exactHint: string;
  waiting: string;
  detected: string;
  verifying: string;
  confirmed: string;
  expired: string;
  retry: string;
  viewTx: string;
  expiresIn: string;
  checkNow: string;
  underpaid: string;
  mismatch: string;
  noWallet: string;
  overpaid: string;
  payHere: string;
  paying: string;
  errNoUsdc: string;
  errInsufficient: string;
  errBuild: string;
}

// Reasons that will never resolve by waiting: the payment was found and does
// not match this request. Everything else (not_finalized, rpc_unavailable,
// settlement_failed) is genuinely still in flight and gets retried.
interface InjectedWallet {
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  request: (args: { method: string; params: unknown }) => Promise<unknown>;
}

function getInjectedWallet(): InjectedWallet | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, any>;
  return w.phantom?.solana ?? w.solflare ?? w.backpack?.solana ?? w.solana ?? null;
}

const TERMINAL_REASONS = new Set([
  "transaction_failed",
  "reference_absent",
  "no_transfer_to_recipient",
  "wrong_decimals",
  "transaction_predates_request",
]);

/** USDC base units to a short decimal string: 5000000 → "5", 5500000 → "5.5". */
function fmtUsdc(minor: number): string {
  const value = minor / 1_000_000;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function fmtCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CryptoPayPanel({
  create,
  labels,
  onConfirmed,
  onNetwork,
}: {
  /** Asks the server to make the request. The amount and recipient come from
      the database; nothing here decides what is owed. */
  create: () => Promise<CryptoRequest>;
  labels: CryptoLabels;
  onConfirmed: (signature: string | null) => void;
  /** Called once a request exists, so a parent can label its own page
      truthfully (live vs test) from the same request the panel received. */
  onNetwork?: (network: string) => void;
}) {
  const [request, setRequest] = useState<CryptoRequest | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string | null>(null);
  const [explorer, setExplorer] = useState<string | null>(null);
  const [overpaid, setOverpaid] = useState<number | null>(null);
  const [statusReason, setStatusReason] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  // The wallet handing back a signature is the one moment we know for certain
  // that a transaction is in flight. The chain has not confirmed it yet, so it
  // is not success — but showing nothing here is why a 17-second wait reads as
  // a broken button and invites a second payment.
  const [submitted, setSubmitted] = useState<string | null>(null);

  const done = useRef(false);
  const requestRef = useRef<CryptoRequest | null>(null);
  const stageRef = useRef<Stage>("loading");
  const pollRef = useRef<() => void>(() => {});
  requestRef.current = request;
  stageRef.current = stage;

  const start = useCallback(async () => {
    setStage("loading");
    setError(null);
    setStatusReason(null);
    setOverpaid(null);
    try {
      const made = await create();
      requestRef.current = made;
      setRequest(made);
      setStage("awaiting_payment");
      onNetwork?.(made.network);
    } catch (err: any) {
      setError(err?.message ?? "Could not start the payment.");
      setStage("error");
    }
  }, [create, onNetwork]);

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A running clock for the countdown. Cheap, and it exists only to show how
  // long the QR is still good for.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // The poll itself, stored in a ref so the scheduler, the "check now" button
  // and returning to the tab all trigger the very same code.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const req = requestRef.current;
      if (!req || done.current) return;
      const current = stageRef.current;
      if (current === "confirmed" || current === "expired" || current === "error") return;

      try {
        const res = await fetch(
          `/api/payments/crypto/status?reference=${encodeURIComponent(req.reference)}`
        );
        const body = await res.json();
        if (cancelled || done.current) return;

        if (body.status === "confirmed") {
          done.current = true;
          setStage("confirmed");
          setExplorer(body.explorer ?? null);
          setOverpaid(typeof body.overpaidMinor === "number" ? body.overpaidMinor : null);
          onConfirmed(body.signature ?? null);
          return;
        }
        if (body.status === "expired") {
          setStage("expired");
          return;
        }
        if (body.status === "detected" || body.status === "verifying") {
          setStage(body.status);
          setStatusReason(body.reason ?? null);
          return;
        }
        if (body.status === "awaiting_payment") {
          setStage("awaiting_payment");
          setStatusReason(null);
        }
      } catch {
        // A failed poll is not a failed payment. Stay quiet and try again.
      }
    }
    pollRef.current = () => {
      if (!cancelled) poll();
    };
    return () => {
      cancelled = true;
    };
  }, [onConfirmed]);

  // Polling is the same server work the webhook triggers, so a payment settles
  // whether or not a notification ever arrives. An immediate first poll, then
  // every three seconds: often enough to feel immediate, rare enough not to
  // hammer the RPC.
  useEffect(() => {
    if (!request) return;
    const tick = () => pollRef.current();
    const first = setTimeout(tick, 1500);
    // Devnet put this payment on chain 17 seconds before the poller noticed.
    // Right after a broadcast the answer is imminent and the person is watching,
    // so ask more often; settle back to the gentler cadence once it is clearly
    // not arriving in the next moment.
    const id = setInterval(tick, submitted ? 1200 : 3000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
    // `submitted` belongs here: without it the interval keeps the cadence it was
    // created with, and the faster polling after a broadcast never takes effect.
  }, [request, submitted]);

  // Returning to the tab should settle immediately, not wait for the next beat
  // of the interval.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") pollRef.current();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Expire locally once the clock passes the deadline — but only while still
  // waiting. A detected or verifying payment must keep being checked.
  const secondsLeft = request
    ? Math.max(0, Math.floor((new Date(request.expiresAt).getTime() - now) / 1000))
    : 0;
  useEffect(() => {
    if (request && stage === "awaiting_payment" && secondsLeft === 0) {
      setStage("expired");
    }
  }, [request, stage, secondsLeft]);

  // Desktop: the wallet is an extension, and no extension registers the
  // `solana:` scheme — the browser refuses the link outright. So the
  // transaction is built on the server and handed over already composed; the
  // wallet only signs and sends. Nothing about the money is decided here.
  async function payWithExtension() {
    const req = requestRef.current;
    const provider = getInjectedWallet();
    if (!req || !provider) return;

    setPaying(true);
    setPayError(null);
    try {
      const { publicKey } = await provider.connect();
      const payer = publicKey.toString();

      const res = await fetch("/api/payments/crypto/tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: req.reference, payer }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.reason === "no_usdc") throw new Error(labels.errNoUsdc);
        if (body.reason === "insufficient") {
          throw new Error(labels.errInsufficient.replace("{have}", body.have ?? "0"));
        }
        throw new Error(body.error ?? labels.errBuild);
      }

      await provider.request({
        method: "signAndSendTransaction",
        params: { message: body.message },
      });

      // Do not claim success here. The chain decides, and the poller is
      // already asking it — a wallet returning is not a settled payment.
      pollRef.current();
    } catch (err: any) {
      const message = String(err?.message ?? "");
      // Closing the wallet is a decision, not an error.
      if (!/User rejected|reject|declin/i.test(message)) {
        setPayError(message || labels.errBuild);
      }
    } finally {
      setPaying(false);
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
    const owedMinor = request.amountMinor ?? 0;
    const sentMinor = owedMinor + (overpaid ?? 0);
    return (
      <motion.div
        className="crypto-panel crypto-done"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <strong>{labels.confirmed}</strong>
        {overpaid !== null && (
          <p className="hint" style={{ margin: 0, textAlign: "center" }}>
            {labels.overpaid
              .replace("{sent}", fmtUsdc(sentMinor))
              .replace("{owed}", fmtUsdc(owedMinor))}
          </p>
        )}
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
  // The same check that pays, so the button is offered exactly when it works.
  // Two separate lists drift: this one omitted the generic `window.solana` that
  // getInjectedWallet accepts, hiding the button from wallets it can drive.
  const hasWallet = getInjectedWallet() !== null;
  const underpaid = (statusReason ?? "").startsWith("underpaid:");
  const terminalMismatch = statusReason ? TERMINAL_REASONS.has(statusReason) : false;
  const receivedMinor = underpaid ? Number(statusReason!.slice("underpaid:".length)) : 0;
  const remainingMinor = Math.max(0, (request.amountMinor ?? 0) - receivedMinor);

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

      {/* Read-only on purpose. Both working paths attach a reference key that is
          the only way Involoop recognises the payment on-chain, so an address
          copied out and sent by hand is real money against an invoice that stays
          unpaid. Warning someone away from a button still leaves the button
          there; the door is closed instead. What remains is worth seeing —
          comparing the address is what catches a swapped page. */}
      <div className="crypto-rows">
        <div className="crypto-row">
          <span>{labels.amountLabel}</span>
          <strong>{request.amount} USDC</strong>
        </div>
        <div className="crypto-row">
          <span>{labels.recipientLabel}</span>
          <code className="mono">{request.recipient.slice(0, 6)}…{request.recipient.slice(-6)}</code>
        </div>
        <p className="hint crypto-manual-warn">{labels.manualWarn}</p>
      </div>

      {hasWallet ? (
        <>
          <button
            type="button"
            className="btn btn-primary btn-mobile-full"
            onClick={payWithExtension}
            disabled={paying}
          >
            {paying ? labels.paying : labels.payHere}
          </button>
          {payError && <p className="error" style={{ margin: 0 }}>{payError}</p>}
        </>
      ) : (
        <>
          {/* Phones only. On desktop this link goes nowhere, because no
              extension registers the scheme. */}
          <a className="btn btn-primary btn-mobile-full" href={request.url}>
            {labels.openWallet}
          </a>
          <p className="hint crypto-note">{labels.noWallet}</p>
        </>
      )}

      <p className="hint crypto-note">{labels.exactHint}</p>
      <p className="hint crypto-note">{labels.feesHint}</p>

      {/* A dead-end must be named, not hidden behind a spinner: someone who
          underpaid or sent the wrong thing is stuck until the panel says so. */}
      {underpaid ? (
        <p className="error" style={{ margin: 0 }}>
          {labels.underpaid.replace("{amount}", fmtUsdc(remainingMinor))}
        </p>
      ) : terminalMismatch ? (
        <p className="error" style={{ margin: 0 }}>{labels.mismatch}</p>
      ) : (
        <></>
      )}
      {(underpaid || terminalMismatch) && (
        <button className="btn btn-ghost" onClick={start}>{labels.retry}</button>
      )}

      {/* The gap this closes: between signing in the wallet and the chain being
          read, the panel used to sit on "waiting for payment" — indistinguishable
          from having done nothing. Seventeen seconds of that is how someone
          decides the button is broken and pays twice. */}
      {submitted && stage === "awaiting_payment" && (
        <div className="crypto-sent" aria-live="polite">
          <span className="crypto-sent-spin" aria-hidden="true" />
          <span>
            <strong>{labels.sentTitle}</strong>
            <span className="hint">{labels.sentBody}</span>
          </span>
        </div>
      )}

      {/* Honest progress. A spinner with no words is how someone concludes the
          payment is stuck and sends it a second time. */}
      <div className="crypto-progress" aria-live="polite">
        <span
          className={
            stage !== "awaiting_payment" ? "is-done" : submitted ? "is-done" : "is-active"
          }
        >
          {labels.waiting}
        </span>
        <span
          className={
            stage === "verifying" || stage === "detected"
              ? "is-active"
              : submitted
                ? "is-active"
                : ""
          }
        >
          {stage === "verifying" ? labels.verifying : labels.detected}
        </span>
      </div>

      {secondsLeft > 0 && (
        <p className="hint crypto-note">
          {labels.expiresIn.replace("{time}", fmtCountdown(secondsLeft))}
        </p>
      )}

      <button type="button" className="link-btn" onClick={() => pollRef.current()}>
        {labels.checkNow}
      </button>
    </div>
  );
}
