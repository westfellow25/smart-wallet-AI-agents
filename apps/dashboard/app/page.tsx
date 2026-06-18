"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Agent, Transaction, TxStatus } from "@/lib/types";
import { money, timeAgo } from "@/lib/format";

const FILTERS: (TxStatus | "ALL")[] = ["ALL", "APPROVED", "PENDING", "BLOCKED"];

const categoryEmoji: Record<string, string> = {
  ads: "📣", api: "🔌", saas: "🧩", compute: "🖥️", crypto: "🪙",
};

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [source, setSource] = useState<"live" | "demo">("demo");
  const [filter, setFilter] = useState<TxStatus | "ALL">("ALL");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions", { cache: "no-store" });
      const data = await res.json();
      setTransactions(data.transactions ?? []);
      setAgents(data.agents ?? []);
      setSource(data.source ?? "demo");
    } catch {
      /* keep previous */
    } finally {
      setLoaded(true);
    }
  }, []);

  // Авто-обновление каждые 5 секунд — ощущение "живого" продукта.
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function decide(id: string, action: "approve" | "reject") {
    // Оптимистично убираем из pending.
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: action === "approve" ? "APPROVED" : "REJECTED" } : t
      )
    );
    await fetch(`/api/transactions/${id}/${action}`, { method: "POST" });
    load();
  }

  const pending = transactions.filter((t) => t.status === "PENDING");

  const kpis = useMemo(() => {
    const approved = transactions.filter((t) => t.status === "APPROVED");
    const blocked = transactions.filter((t) => t.status === "BLOCKED");
    const spent = approved.reduce((s, t) => s + t.amount, 0);
    const activeAgents = agents.filter((a) => a.status === "ACTIVE").length;
    return {
      spent,
      activeAgents,
      total: transactions.length,
      blocked: blocked.length,
      pending: pending.length,
    };
  }, [transactions, agents, pending.length]);

  const visible = transactions.filter((t) => filter === "ALL" || t.status === filter);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">AV</div>
          <div>
            <h1>AgentVault — Control Tower</h1>
            <p>Corporate wallet for AI agents</p>
          </div>
        </div>
        <div className="source-pill">
          <span className={`dot ${source === "demo" ? "demo" : ""}`} />
          {source === "live" ? "Live — connected to API" : "Demo data (API offline)"}
        </div>
      </header>

      <section className="kpis">
        <Kpi label="Spent today" value={money(kpis.spent)} sub="across all agents" />
        <Kpi label="Active agents" value={String(kpis.activeAgents)} sub={`${agents.length} total`} />
        <Kpi label="Transactions" value={String(kpis.total)} sub="last 100" />
        <Kpi label="Pending approval" value={String(kpis.pending)} sub="needs human" />
        <Kpi label="Blocked" value={String(kpis.blocked)} sub="by policy" />
      </section>

      <div className="grid">
        <section className="panel">
          <h2>
            Live transaction feed
            <span className="count">{visible.length} shown</span>
          </h2>
          <div className="filters">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={filter === f ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          {!loaded ? (
            <div className="empty">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="empty">No transactions</div>
          ) : (
            visible.map((t) => (
              <div className="tx" key={t.id}>
                <div className="avatar">{categoryEmoji[t.category] ?? "💳"}</div>
                <div className="info">
                  <div className="merchant">{t.merchant}</div>
                  <div className="meta">
                    {t.agent?.name ?? "agent"} · {t.category} · {timeAgo(t.createdAt)}
                  </div>
                </div>
                <div className="amount">{money(t.amount, t.currency)}</div>
                <span className={`badge ${t.status}`}>{t.status}</span>
              </div>
            ))
          )}
        </section>

        <div>
          <section className="panel">
            <h2>
              Pending approvals
              <span className="count">{pending.length}</span>
            </h2>
            {pending.length === 0 ? (
              <div className="empty">🎉 Nothing waiting</div>
            ) : (
              pending.map((t) => (
                <div className="approval" key={t.id}>
                  <div className="head">
                    <div>
                      <div className="merchant">{t.merchant}</div>
                      <div className="meta">{t.agent?.name} · {t.category}</div>
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
              ))
            )}
          </section>

          <div className="sep" />

          <section className="panel">
            <h2>
              Agent wallets
              <span className="count">{agents.length}</span>
            </h2>
            {agents.map((a) => {
              const bal = a.wallet?.balance ?? 0;
              const spent = a.wallet?.dailySpent ?? 0;
              const total = bal + spent || 1;
              const pct = Math.min(100, Math.round((spent / total) * 100));
              const color = pct > 80 ? "var(--red)" : pct > 50 ? "var(--amber)" : "var(--green)";
              return (
                <div className="agent" key={a.id}>
                  <div className="row">
                    <span className="name">
                      <span
                        className="dot"
                        style={{ background: a.status === "ACTIVE" ? "var(--green)" : "var(--muted)", boxShadow: "none" }}
                      />
                      {a.name}
                    </span>
                    <span className="bal">{money(bal)} left</span>
                  </div>
                  <div className="bar">
                    <span style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}
