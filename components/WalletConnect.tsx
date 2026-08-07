"use client";

import { useState } from "react";

// Connecting a Solana wallet without a wallet-adapter dependency.
//
// Phantom, Solflare and Backpack all inject an object with the same three
// things used here: connect(), publicKey, signMessage(). That is the whole
// surface needed to prove ownership, and it costs nothing to ship.
//
// This address decides where a client's money lands, so it is never simply
// typed in and believed. The wallet signs a server-issued challenge, and the
// server checks the signature against the address.

interface InjectedWallet {
  isPhantom?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  signMessage: (message: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
  publicKey?: { toString(): string };
}

function findWallet(): InjectedWallet | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, any>;
  return w.phantom?.solana ?? w.solflare ?? w.backpack?.solana ?? w.solana ?? null;
}

export default function WalletConnect({
  current,
  labels,
  onConnected,
}: {
  current: string | null;
  labels: {
    connect: string;
    change: string;
    connecting: string;
    noWallet: string;
    connected: string;
    warning: string;
  };
  onConnected: (wallet: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setError(null);
    const wallet = findWallet();
    if (!wallet) {
      setError(labels.noWallet);
      return;
    }

    setBusy(true);
    try {
      const { publicKey } = await wallet.connect();
      const address = publicKey.toString();

      // The challenge comes from the server, so a page cannot hand the wallet
      // something it prepared in advance.
      const nonceRes = await fetch("/api/wallet/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address }),
      });
      const challenge = await nonceRes.json().catch(() => ({}));
      if (!nonceRes.ok) throw new Error(challenge.error ?? "Could not start verification.");

      const encoded = new TextEncoder().encode(challenge.message);
      const signed = await wallet.signMessage(encoded, "utf8");
      const raw = signed instanceof Uint8Array ? signed : signed.signature;

      // base58, because that is what the chain and the server speak.
      const signature = bs58encode(raw);

      const verifyRes = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          signature,
          nonce: challenge.nonce,
          message: challenge.message,
        }),
      });
      const out = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) throw new Error(out.error ?? "Could not verify that wallet.");

      onConnected(address);
    } catch (err: any) {
      // Closing the wallet popup is a decision, not an error worth shouting at.
      const message = String(err?.message ?? "");
      if (!/User rejected|reject/i.test(message)) {
        setError(message || "Could not connect that wallet.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wallet-box">
      {current ? (
        <div className="wallet-current">
          <span className="invoice-label">{labels.connected}</span>
          <code className="mono wallet-address">{current}</code>
        </div>
      ) : null}

      <div className="side" style={{ gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" onClick={connect} disabled={busy}>
          {busy ? labels.connecting : current ? labels.change : labels.connect}
        </button>
      </div>

      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
      <p className="wallet-warning">{labels.warning}</p>
    </div>
  );
}

// A 40-line base58 encoder, rather than shipping a library to the browser for
// one function. Same alphabet the rest of Solana uses.
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function bs58encode(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  // Leading zero BYTES become leading '1's; leading zero DIGITS are just the
  // number being shorter and must not be emitted. Getting this wrong adds a
  // character to any all-zero input — which is a real address: the System
  // Program is thirty-two zero bytes.
  let out = "";
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) out += ALPHABET[0];
  let end = digits.length;
  while (end > 0 && digits[end - 1] === 0) end--;
  for (let i = end - 1; i >= 0; i--) out += ALPHABET[digits[i]];
  return out;
}
