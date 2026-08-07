"use client";

import { useEffect } from "react";
import Link from "next/link";

// Without this, one thrown error during render is a white screen — on a page
// where someone may be about to pay an invoice. This keeps the brand, says
// something true, and offers the two ways out.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("render error", error);
  }, [error]);

  return (
    <main className="centered">
      <h1 className="page-title">Something broke on our side</h1>
      <p className="hint" style={{ maxWidth: 420, margin: "0 auto 20px" }}>
        The page could not finish loading. Your invoices and payments are not
        affected — this is a display problem, not a data one.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Back to home
        </Link>
      </div>
      {error.digest && (
        <p className="hint" style={{ marginTop: 18 }}>
          Reference: <code className="mono">{error.digest}</code>
        </p>
      )}
    </main>
  );
}
