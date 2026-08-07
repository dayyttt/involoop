"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { formatMoney, formatDateShort } from "@/lib/money";

// One account, and everything an operator can do to it.
//
// Every destructive action asks for a reason before it will run, and the reason
// is stored in the audit log rather than thrown away. That is not paperwork: a
// suspension nobody can explain three weeks later is a support problem, and an
// operator who knows their name is attached behaves differently from one who
// does not.
export default function UserDrawer({
  userId,
  onClose,
  onChanged,
}: {
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [reason, setReason] = useState("");
  const [delta, setDelta] = useState("");
  const [plan, setPlan] = useState("free");

  const panelRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/admin/users/${userId}`);
    if (!res.ok) {
      setError("Could not load that account.");
      return;
    }
    const body = await res.json();
    setData(body);
    setPlan(body.profile.plan);
  }

  useEffect(() => {
    load();
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function act(body: Record<string, unknown>, success: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(out.error ?? "Could not complete that action.");
      return;
    }
    setNotice(success);
    setReason("");
    setDelta("");
    await load();
    onChanged();
  }

  const p = data?.profile;
  const suspended = !!p?.suspended_at;

  return (
    <motion.div
      className="modal-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Account"
        className="admin-drawer"
        initial={{ x: 32, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 32, opacity: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <header className="modal-head">
          <div>
            <span className="invoice-label">Account</span>
            <h2 className="modal-title">{p?.full_name || p?.email || "…"}</h2>
            {p && <span className="hint">{p.email}</span>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="modal-body">
          {!p ? (
            <div className="skel skel-row" />
          ) : (
            <>
              {suspended && (
                <p className="modal-locked">
                  Suspended {formatDateShort(p.suspended_at)}
                  {p.suspended_reason ? ` — ${p.suspended_reason}` : ""}. This account cannot publish
                  invoices.
                </p>
              )}

              <div className="settings-rows">
                <div className="settings-row"><span>Plan</span><strong>{p.plan}</strong></div>
                <div className="settings-row"><span>Credits</span><strong>{p.free_invoice_credits}</strong></div>
                <div className="settings-row"><span>Role</span><strong>{p.role}</strong></div>
                <div className="settings-row"><span>PayPal</span><strong>{p.paypal_email ?? "not set"}</strong></div>
                <div className="settings-row"><span>Joined</span><strong>{formatDateShort(p.created_at)}</strong></div>
              </div>

              {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
              {notice && <p className="text-ok" style={{ margin: 0, fontSize: 13 }}>{notice}</p>}

              {/* One reason field for every action below it: whatever the
                  operator is about to do, the record will say why. */}
              <div className="field">
                <label htmlFor="admin-reason">Reason (kept in the audit log)</label>
                <input
                  id="admin-reason"
                  className="input"
                  value={reason}
                  maxLength={300}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Refund request, abuse report, support ticket…"
                />
              </div>

              <div className="admin-action">
                <div>
                  <strong>Account access</strong>
                  <p className="hint">
                    A suspended account keeps its data and its invoices stay payable — it simply
                    cannot publish anything new.
                  </p>
                </div>
                <button
                  className={suspended ? "btn btn-primary" : "btn btn-quiet-danger"}
                  disabled={busy}
                  onClick={() =>
                    act(
                      { action: "suspend", suspended: !suspended, reason },
                      suspended ? "Access restored." : "Account suspended."
                    )
                  }
                >
                  {suspended ? "Restore access" : "Suspend"}
                </button>
              </div>

              <div className="admin-action">
                <div>
                  <strong>Credits</strong>
                  <p className="hint">Goes to the ledger too, so their history matches the balance.</p>
                </div>
                <div className="side" style={{ gap: 8 }}>
                  <input
                    className="input"
                    style={{ width: 90 }}
                    type="number"
                    value={delta}
                    placeholder="+3"
                    onChange={(e) => setDelta(e.target.value)}
                  />
                  <button
                    className="btn btn-ghost"
                    disabled={busy || !delta || !reason.trim()}
                    onClick={() => act({ action: "credits", delta: Number(delta), reason }, "Credits adjusted.")}
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div className="admin-action">
                <div>
                  <strong>Plan</strong>
                  <p className="hint">Granting Pro here gives 30 days without a payment.</p>
                </div>
                <div className="side" style={{ gap: 8 }}>
                  <select className="input" style={{ width: 120 }} value={plan} onChange={(e) => setPlan(e.target.value)}>
                    <option value="free">free</option>
                    <option value="starter">starter</option>
                    <option value="pro">pro</option>
                  </select>
                  <button
                    className="btn btn-ghost"
                    disabled={busy || plan === p.plan}
                    onClick={() => act({ action: "plan", plan, days: 30, reason }, "Plan changed.")}
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div className="admin-action">
                <div>
                  <strong>Operator access</strong>
                  <p className="hint">
                    An admin can see and change every account. The last remaining admin cannot be
                    demoted, and nobody can change their own role.
                  </p>
                </div>
                <button
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() =>
                    act(
                      { action: "role", role: p.role === "admin" ? "user" : "admin" },
                      p.role === "admin" ? "Operator access removed." : "Operator access granted."
                    )
                  }
                >
                  {p.role === "admin" ? "Remove admin" : "Make admin"}
                </button>
              </div>

              <section>
                <span className="bento-label">Invoices</span>
                {data.invoices.length === 0 ? (
                  <p className="empty">None yet.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <tbody>
                        {data.invoices.map((i: any) => (
                          <tr key={i.public_id}>
                            <td>
                              <strong>{i.number}</strong>
                              <span className="admin-sub">{i.client_name}</span>
                            </td>
                            <td>{i.status}</td>
                            <td className="num">{formatMoney(i.amount, i.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <span className="bento-label">What operators have done here</span>
                {data.audit.length === 0 ? (
                  <p className="empty">Nothing yet.</p>
                ) : (
                  <div className="ledger-list">
                    {data.audit.map((a: any, i: number) => (
                      <div className="ledger-row" key={i}>
                        <span className="ledger-ref">
                          <strong>{a.action}</strong> · {a.actor_email}
                        </span>
                        <span className="hint">{formatDateShort(a.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}
