"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PaymentRequest, Transfer } from "@/lib/types";
import { money, timeAgo } from "@/lib/format";

export default function Payments() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [source, setSource] = useState<"live" | "demo">("demo");

  const load = useCallback(async () => {
    const res = await fetch("/api/transfers", { cache: "no-store" });
    const data = await res.json();
    setTransfers(data.transfers ?? []);
    setRequests(data.paymentRequests ?? []);
    setSource(data.source ?? "demo");
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function decide(id: string, action: "approve" | "reject") {
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: action === "approve" ? "APPROVED" : "REJECTED" } : t
      )
    );
    await fetch(`/api/transfers/${id}/${action}`, { method: "POST" });
    load();
  }

  async function cancel(id: string) {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "CANCELED" } : r))
    );
    await fetch(`/api/payment-requests/${id}/cancel`, { method: "POST" });
    load();
  }

  const pending = transfers.filter((t) => t.status === "PENDING");
  const settled = transfers.reduce((s, t) => (t.status === "APPROVED" ? s + t.amount : s), 0);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">AV</div>
          <div>
            <h1>AgentVault — Agent Payments</h1>
            <p>Agent-to-agent transfers &amp; invoices — under policy</p>
          </div>
        </div>
        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Control Tower</Link>
          <Link href="/agents">Agents</Link>
          <span className="active">Payments</span>
          <Link href="/cards">Cards</Link>
          <Link href="/billing">Billing</Link>
        </nav>
        <div className="source-pill">
          <span className={`dot ${source === "demo" ? "demo" : ""}`} />
          {source === "live" ? "Live" : "Demo data"}
        </div>
      </header>

      <section className="kpis" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="kpi">
          <div className="label">Settled A2A volume</div>
          <div className="value">{money(settled)}</div>
          <div className="sub">approved transfers</div>
        </div>
        <div className="kpi">
          <div className="label">Pending approval</div>
          <div className="value">{pending.length}</div>
          <div className="sub">agent-to-agent</div>
        </div>
        <div className="kpi">
          <div className="label">Open invoices</div>
          <div className="value">{requests.filter((r) => r.status === "OPEN").length}</div>
          <div className="sub">payment requests</div>
        </div>
      </section>

      <div className="grid">
        <section className="panel">
          <h2>
            Agent-to-agent transfers
            <span className="count">{transfers.length}</span>
          </h2>
          {transfers.length === 0 ? (
            <div className="empty">No transfers yet</div>
          ) : (
            transfers.map((t) => (
              <div className="tx" key={t.id}>
                <div className="avatar">🔁</div>
                <div className="info">
                  <div className="merchant">
                    {t.fromAgent?.name} <span style={{ color: "var(--muted)" }}>→</span>{" "}
                    {t.toAgent?.name}
                  </div>
                  <div className="meta">
                    {t.memo ?? t.category} · {timeAgo(t.createdAt)}
                  </div>
                </div>
                <div className="amount">{money(t.amount, t.currency)}</div>
                <span className={`badge ${t.status}`}>{t.status}</span>
              </div>
            ))
          )}
        </section>

        <div>
          {pending.length > 0 && (
            <>
              <section className="panel">
                <h2>
                  Pending A2A approvals
                  <span className="count">{pending.length}</span>
                </h2>
                {pending.map((t) => (
                  <div className="approval" key={t.id}>
                    <div className="head">
                      <div>
                        <div className="merchant">
                          {t.fromAgent?.name} → {t.toAgent?.name}
                        </div>
                        <div className="meta">{t.memo ?? t.category}</div>
                      </div>
                      <div className="amount">{money(t.amount, t.currency)}</div>
                    </div>
                    <div className="reason">{t.reason}</div>
                    <div className="actions">
                      <button className="btn approve" onClick={() => decide(t.id, "approve")}>
                        ✓ Approve
                      </button>
                      <button className="btn reject" onClick={() => decide(t.id, "reject")}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </section>
              <div className="sep" />
            </>
          )}

          <section className="panel">
            <h2>
              Payment requests
              <span className="count">{requests.length}</span>
            </h2>
            {requests.length === 0 ? (
              <div className="empty">No invoices</div>
            ) : (
              requests.map((r) => (
                <div className="invoice" key={r.id}>
                  <div className="inv-head">
                    <div>
                      <div className="merchant">{r.payee?.name}</div>
                      <div className="meta">
                        {r.payer ? `from ${r.payer.name}` : "open to anyone"} · {timeAgo(r.createdAt)}
                      </div>
                    </div>
                    <div className="amount">{money(r.amount, r.currency)}</div>
                  </div>
                  <div className="inv-memo">{r.memo}</div>
                  <div className="inv-foot">
                    <span className={`badge ${r.status === "PAID" ? "APPROVED" : r.status === "CANCELED" ? "BLOCKED" : "PENDING"}`}>
                      {r.status}
                    </span>
                    {r.status === "OPEN" && (
                      <button className="mini" onClick={() => cancel(r.id)}>Cancel</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
