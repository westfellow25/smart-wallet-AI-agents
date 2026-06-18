"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Agent, Policy } from "@/lib/types";
import { money } from "@/lib/format";

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [source, setSource] = useState<"live" | "demo">("demo");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // agent form
  const [aName, setAName] = useState("");
  const [aBalance, setABalance] = useState("1000");

  // policy form
  const [pName, setPName] = useState("");
  const [pTx, setPTx] = useState("500");
  const [pDaily, setPDaily] = useState("2000");
  const [pApproval, setPApproval] = useState("200");
  const [pCats, setPCats] = useState("ads, api, saas, compute");

  async function load() {
    const [a, p] = await Promise.all([
      fetch("/api/agents", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/policies", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setAgents(a.agents ?? []);
    setPolicies(p.policies ?? []);
    setSource(a.source ?? "demo");
  }
  useEffect(() => {
    load();
  }, []);

  async function addAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!aName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: aName.trim(),
          startingBalance: Math.round(Number(aBalance) * 100), // $ -> центы
        }),
      });
      const created = await res.json();
      if (created.apiKey) setNewKey(created.apiKey);
      setAName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function issueCard(agentId: string) {
    await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    });
    await load();
  }

  async function addPolicy(e: React.FormEvent) {
    e.preventDefault();
    if (!pName.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pName.trim(),
          maxPerTransaction: Math.round(Number(pTx) * 100) || null,
          dailyLimit: Math.round(Number(pDaily) * 100) || null,
          requireApprovalOver: Math.round(Number(pApproval) * 100) || null,
          allowedCategories: pCats.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      setPName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">AV</div>
          <div>
            <h1>AgentVault — Agents &amp; Policies</h1>
            <p>Provision agents, issue cards, set spending rules</p>
          </div>
        </div>
        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Control Tower</Link>
          <span className="active">Agents</span>
          <Link href="/cards">Cards</Link>
          <Link href="/billing">Billing</Link>
        </nav>
        <div className="source-pill">
          <span className={`dot ${source === "demo" ? "demo" : ""}`} />
          {source === "live" ? "Live" : "Demo data"}
        </div>
      </header>

      {newKey && (
        <div className="keybanner">
          <div>
            <strong>API key created</strong> — показывается один раз, сохрани сейчас:
            <code>{newKey}</code>
          </div>
          <button onClick={() => setNewKey(null)}>✕</button>
        </div>
      )}

      <div className="grid">
        <div>
          <section className="panel">
            <h2>New agent</h2>
            <form className="form" onSubmit={addAgent}>
              <label>
                Name
                <input value={aName} onChange={(e) => setAName(e.target.value)} placeholder="Marketing Bot" />
              </label>
              <label>
                Starting balance ($)
                <input type="number" min="0" value={aBalance} onChange={(e) => setABalance(e.target.value)} />
              </label>
              <button className="form-btn" disabled={busy}>Create agent</button>
            </form>
          </section>

          <div className="sep" />

          <section className="panel">
            <h2>
              Agents
              <span className="count">{agents.length}</span>
            </h2>
            {agents.length === 0 ? (
              <div className="empty">No agents yet</div>
            ) : (
              agents.map((a) => (
                <div className="agent" key={a.id}>
                  <div className="row">
                    <span className="name">
                      <span
                        className="dot"
                        style={{ background: a.status === "ACTIVE" ? "var(--green)" : "var(--muted)", boxShadow: "none" }}
                      />
                      {a.name}
                    </span>
                    <span className="bal">{money(a.wallet?.balance ?? 0)}</span>
                  </div>
                  <div className="agent-actions">
                    <button className="mini" onClick={() => issueCard(a.id)}>+ Issue card</button>
                    <span className="agent-status">{a.status}</span>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        <div>
          <section className="panel">
            <h2>New policy</h2>
            <form className="form" onSubmit={addPolicy}>
              <label>
                Name
                <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Default spending policy" />
              </label>
              <div className="form-row">
                <label>
                  Max / tx ($)
                  <input type="number" min="0" value={pTx} onChange={(e) => setPTx(e.target.value)} />
                </label>
                <label>
                  Daily limit ($)
                  <input type="number" min="0" value={pDaily} onChange={(e) => setPDaily(e.target.value)} />
                </label>
              </div>
              <label>
                Approval over ($)
                <input type="number" min="0" value={pApproval} onChange={(e) => setPApproval(e.target.value)} />
              </label>
              <label>
                Allowed categories (comma-separated)
                <input value={pCats} onChange={(e) => setPCats(e.target.value)} />
              </label>
              <button className="form-btn" disabled={busy}>Create policy</button>
            </form>
          </section>

          <div className="sep" />

          <section className="panel">
            <h2>
              Policies
              <span className="count">{policies.length}</span>
            </h2>
            {policies.length === 0 ? (
              <div className="empty">No policies yet</div>
            ) : (
              policies.map((p) => (
                <div className="policy" key={p.id}>
                  <div className="policy-name">{p.name}</div>
                  <div className="policy-meta">
                    {p.maxPerTransaction ? `max ${money(p.maxPerTransaction)}/tx · ` : ""}
                    {p.dailyLimit ? `${money(p.dailyLimit)}/day · ` : ""}
                    {p.requireApprovalOver ? `approve > ${money(p.requireApprovalOver)}` : ""}
                  </div>
                  {p.allowedCategories.length > 0 && (
                    <div className="policy-cats">
                      {p.allowedCategories.map((c) => (
                        <span className="cat" key={c}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
