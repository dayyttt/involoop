"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { formatMoney, formatDateShort } from "@/lib/money";
import UserDrawer from "./user-drawer";

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  plan_expires_at: string | null;
  role: string;
  suspended_at: string | null;
  free_invoice_credits: number;
  created_at: string;
  invoice_count: number;
  paid_count: number;
}

interface Overview {
  users: { total: number; admins: number; suspended: number; paid: number; new_7d: number };
  invoices: { total: number; paid: number; unpaid: number; pending: number; new_7d: number };
  money: { currency: string; billed: number; received: number; outstanding: number }[];
  loop: { views: number; clicks: number; signups: number; credits_issued: number };
  ops: { payments_succeeded: number; payments_failed: number; webhooks_failed: number; webhooks_24h: number };
}

type Tab = "overview" | "users" | "ops" | "audit";
const PAGE = 25;

const TAB_KEYS: Tab[] = ["overview", "users", "ops", "audit"];

export default function AdminConsole() {
  const [tab, setTabState] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [ops, setOps] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [recent, setRecent] = useState<AdminUserRow[]>([]);

  // The open tab lives in the URL, so a view can be bookmarked or pasted to
  // another operator instead of described.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (TAB_KEYS.includes(t as Tab)) setTabState(t as Tab);
  }, []);

  function setTab(next: Tab) {
    setTabState(next);
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setOverview)
      .catch(() => setError("Could not load the console."));

    // The five newest accounts, from the same endpoint the Users tab uses.
    fetch("/api/admin/users?limit=5")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRecent(d.rows ?? []))
      .catch(() => {});
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const params = new URLSearchParams({
      search,
      filter,
      limit: String(PAGE),
      offset: String(page * PAGE),
    });
    const res = await fetch(`/api/admin/users?${params}`);
    setLoadingUsers(false);
    if (!res.ok) return setError("Could not load users.");
    const data = await res.json();
    setUsers(data.rows ?? []);
    setTotal(data.total ?? 0);
  }, [search, filter, page]);

  useEffect(() => {
    if (tab !== "users") return;
    // Typing filters the list, so the request waits until typing stops rather
    // than firing once per keystroke.
    const t = setTimeout(loadUsers, 250);
    return () => clearTimeout(t);
  }, [tab, loadUsers]);

  useEffect(() => {
    if (tab === "ops" && !ops) {
      fetch("/api/admin/ops")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setOps(d))
        .catch(() => setError("Could not load operations."));
    }
    if (tab === "audit") {
      fetch("/api/admin/audit")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setAudit(d.rows ?? []))
        .catch(() => setError("Could not load the audit log."));
    }
  }, [tab, ops]);

  function refreshAll() {
    fetch("/api/admin/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setOverview(d))
      .catch(() => {});
    if (tab === "users") loadUsers();
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "ops", label: "Payments & webhooks" },
    { key: "audit", label: "Audit log" },
  ];

  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>
        <div className="side" style={{ gap: 10 }}>
          <span className="admin-tag">Operator</span>
          <Link href="/dashboard" className="btn btn-ghost">
            My dashboard
          </Link>
        </div>
      </nav>

      <main className="dash-shell">
        <header className="admin-head">
          <h1>Operator console</h1>
          <p className="hint">
            Everything on the platform, and the record of what operators have done to it.
          </p>
        </header>

        {error && <p className="error">{error}</p>}

        <div className="dash-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`dash-tab ${tab === t.key ? "is-active" : ""}`}
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            {!overview ? (
              <div className="admin-grid">
                {[0, 1, 2, 3].map((i) => (
                  <div className="skel skel-stat" key={i} />
                ))}
              </div>
            ) : (
              <>
                <div className="admin-grid">
                  <Metric label="Users" value={overview.users.total} sub={`+${overview.users.new_7d} in 7 days`} />
                  <Metric label="On a paid plan" value={overview.users.paid} sub={`${overview.users.admins} admin`} />
                  <Metric label="Invoices" value={overview.invoices.total} sub={`${overview.invoices.paid} paid`} />
                  <Metric
                    label="Suspended"
                    value={overview.users.suspended}
                    sub={overview.users.suspended > 0 ? "needs review" : "none"}
                    tone={overview.users.suspended > 0 ? "warn" : undefined}
                  />
                </div>

                <section className="card-panel dash-block">
                  <h2 className="section-title" style={{ marginTop: 0 }}>Money on the platform</h2>
                  <p className="hint" style={{ marginTop: 0 }}>
                    Per currency. Never added together — a total across currencies is true of nothing.
                  </p>
                  {overview.money.length === 0 ? (
                    <p className="empty">No invoices yet.</p>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th className="grow">Currency</th>
                            <th className="num">Billed</th>
                            <th className="num">Received</th>
                            <th className="num">Outstanding</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.money.map((m) => (
                            <tr key={m.currency}>
                              <td><strong>{m.currency}</strong></td>
                              <td className="num">{formatMoney(m.billed ?? 0, m.currency)}</td>
                              <td className="num text-ok">{formatMoney(m.received ?? 0, m.currency)}</td>
                              <td className="num">{formatMoney(m.outstanding ?? 0, m.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="card-panel dash-block">
                  <div className="admin-section-head">
                    <h2 className="section-title" style={{ margin: 0 }}>Newest accounts</h2>
                    <button type="button" className="link-btn" onClick={() => setTab("users")}>
                      See all
                    </button>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table admin-table-tight">
                      <tbody>
                        {recent.map((u) => (
                          <tr key={u.id}>
                            <td className="grow">
                              <strong>{u.full_name || "—"}</strong>
                              <span className="admin-sub">{u.email}</span>
                            </td>
                            <td>{u.plan}</td>
                            <td className="num">{u.invoice_count} inv</td>
                            <td>{formatDateShort(u.created_at)}</td>
                            <td className="num">
                              <button className="btn btn-ghost btn-xs" onClick={() => setOpenUser(u.id)}>
                                Open
                              </button>
                            </td>
                          </tr>
                        ))}
                        {recent.length === 0 && (
                          <tr><td><p className="empty" style={{ padding: 12 }}>Nobody yet.</p></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="admin-two">
                  <section className="card-panel">
                    <h2 className="section-title" style={{ marginTop: 0 }}>The loop</h2>
                    <div className="settings-rows">
                      <Row k="Invoice views" v={overview.loop.views} />
                      <Row k="Referral clicks" v={overview.loop.clicks} />
                      <Row k="Signups through invoices" v={overview.loop.signups} />
                      <Row k="Credits issued" v={overview.loop.credits_issued} />
                    </div>
                  </section>
                  <section className="card-panel">
                    <h2 className="section-title" style={{ marginTop: 0 }}>Operations</h2>
                    <div className="settings-rows">
                      <Row k="Payments succeeded" v={overview.ops.payments_succeeded} />
                      <Row k="Payments failed" v={overview.ops.payments_failed} tone={overview.ops.payments_failed > 0 ? "warn" : undefined} />
                      <Row k="Webhooks failed" v={overview.ops.webhooks_failed} tone={overview.ops.webhooks_failed > 0 ? "warn" : undefined} />
                      <Row k="Webhooks in 24h" v={overview.ops.webhooks_24h} />
                    </div>
                  </section>
                </div>
              </>
            )}
          </>
        )}

        {tab === "users" && (
          <>
            <div className="admin-controls">
              <input
                className="input"
                placeholder="Search email or name"
                value={search}
                onChange={(e) => {
                  setPage(0);
                  setSearch(e.target.value);
                }}
              />
              <div className="chip-row" style={{ margin: 0 }}>
                {["all", "paid", "free", "suspended", "admin"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`chip ${filter === f ? "chip-active" : ""}`}
                    onClick={() => {
                      setPage(0);
                      setFilter(f);
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-table-wrap card-panel" style={{ padding: 0 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="grow">User</th>
                    <th>Plan</th>
                    <th className="num">Credits</th>
                    <th className="num">Invoices</th>
                    <th>Joined</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={u.suspended_at ? "is-suspended" : ""}>
                      <td className="grow">
                        <span className="admin-name">
                          <strong>{u.full_name || "—"}</strong>
                          {u.role === "admin" && <span className="badge badge-role">admin</span>}
                          {u.suspended_at && <span className="badge badge-unpaid">suspended</span>}
                        </span>
                        <span className="admin-sub">{u.email}</span>
                      </td>
                      <td>{u.plan}</td>
                      <td className="num">{u.free_invoice_credits}</td>
                      <td className="num">
                        {u.invoice_count > 0 ? `${u.invoice_count} · ${u.paid_count} paid` : "—"}
                      </td>
                      <td>{formatDateShort(u.created_at)}</td>
                      <td className="num">
                        <button className="btn btn-ghost btn-xs" onClick={() => setOpenUser(u.id)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !loadingUsers && (
                    <tr>
                      <td colSpan={6}>
                        <p className="empty" style={{ padding: 20, textAlign: "center" }}>
                          Nobody matches that.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-pager">
              <span className="hint">
                {total === 0 ? "0" : `${page * PAGE + 1}–${Math.min((page + 1) * PAGE, total)}`} of {total}
              </span>
              <div className="side" style={{ gap: 8 }}>
                <button className="btn btn-ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={(page + 1) * PAGE >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {tab === "ops" && (
          <>
            <section className="card-panel">
              <h2 className="section-title" style={{ marginTop: 0 }}>Recent payments</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="grow">Invoice</th>
                      <th>Provider</th>
                      <th>Status</th>
                      <th className="num">Amount</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ops?.payments ?? []).map((p: any, i: number) => (
                      <tr key={i}>
                        <td>{p.invoice_number ?? "— plan —"}</td>
                        <td>{p.provider}</td>
                        <td className={p.status === "succeeded" ? "text-ok" : ""}>{p.status}</td>
                        <td className="num">{formatMoney(p.amount_minor / 100, p.currency)}</td>
                        <td>{formatDateShort(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card-panel dash-block">
              <h2 className="section-title" style={{ marginTop: 0 }}>Webhook events</h2>
              <p className="hint" style={{ marginTop: 0 }}>
                Where to look first when an invoice says unpaid and the client says otherwise.
              </p>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="grow">Event</th>
                      <th>Status</th>
                      <th>Provider</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ops?.webhooks ?? []).map((w: any, i: number) => (
                      <tr key={i}>
                        <td>{w.event_type}</td>
                        <td className={w.status === "failed" ? "text-warn" : ""}>{w.status}</td>
                        <td>{w.provider}</td>
                        <td>{formatDateShort(w.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab === "audit" && (
          <section className="card-panel">
            <h2 className="section-title" style={{ marginTop: 0 }}>Everything an operator has done</h2>
            <p className="hint" style={{ marginTop: 0 }}>
              Append-only. Admin power without a record of its use is indistinguishable from a breach.
            </p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th className="grow">Operator</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((a, i) => (
                    <tr key={i}>
                      <td>{formatDateShort(a.created_at)}</td>
                      <td>{a.actor_email}</td>
                      <td><strong>{a.action}</strong></td>
                      <td>{a.target_email ?? "—"}</td>
                      <td className="admin-detail">{JSON.stringify(a.detail)}</td>
                    </tr>
                  ))}
                  {audit.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <p className="empty" style={{ padding: 20, textAlign: "center" }}>
                          Nothing has been done yet.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <AnimatePresence>
        {openUser && (
          <UserDrawer
            userId={openUser}
            onClose={() => setOpenUser(null)}
            onChanged={refreshAll}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "warn";
}) {
  return (
    <motion.div
      className={`admin-metric ${tone === "warn" ? "is-warn" : ""}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <span className="bento-label">{label}</span>
      <strong>{value}</strong>
      {sub && <span className="hint">{sub}</span>}
    </motion.div>
  );
}

function Row({ k, v, tone }: { k: string; v: number; tone?: "warn" }) {
  return (
    <div className="settings-row">
      <span>{k}</span>
      <strong className={tone === "warn" ? "text-warn" : ""}>{v}</strong>
    </div>
  );
}
