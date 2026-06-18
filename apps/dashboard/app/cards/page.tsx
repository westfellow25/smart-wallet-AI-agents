"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { VirtualCard } from "@/lib/types";

export default function Cards() {
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [source, setSource] = useState<"live" | "demo">("demo");

  async function load() {
    const res = await fetch("/api/cards", { cache: "no-store" });
    const data = await res.json();
    setCards(data.cards ?? []);
    setSource(data.source ?? "demo");
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(c: VirtualCard) {
    const action = c.status === "ACTIVE" ? "freeze" : "unfreeze";
    setCards((prev) =>
      prev.map((x) =>
        x.id === c.id ? { ...x, status: action === "freeze" ? "FROZEN" : "ACTIVE" } : x
      )
    );
    await fetch(`/api/cards/${c.id}/${action}`, { method: "POST" });
    load();
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">AV</div>
          <div>
            <h1>AgentVault — Virtual Cards</h1>
            <p>One card per agent · USDC on Base L2</p>
          </div>
        </div>
        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Control Tower</Link>
          <Link href="/agents">Agents</Link>
          <span className="active">Cards</span>
          <Link href="/billing">Billing</Link>
        </nav>
        <div className="source-pill">
          <span className={`dot ${source === "demo" ? "demo" : ""}`} />
          {source === "live" ? "Live" : "Demo data"}
        </div>
      </header>

      <div className="card-grid">
        {cards.map((c) => {
          const frozen = c.status === "FROZEN";
          const usdc = c.network === "USDC_BASE";
          return (
            <div key={c.id} className={`vcard ${frozen ? "frozen" : ""} ${usdc ? "usdc" : "visa"}`}>
              <div className="vcard-top">
                <span className="vchip" />
                <span className={`vstatus ${frozen ? "f" : "a"}`}>
                  {frozen ? "FROZEN" : "ACTIVE"}
                </span>
              </div>
              <div className="vnum">•••• •••• •••• {c.last4}</div>
              <div className="vrow">
                <div>
                  <div className="vlabel">Agent</div>
                  <div className="vval">{c.agent?.name ?? "—"}</div>
                </div>
                <div>
                  <div className="vlabel">Expires</div>
                  <div className="vval">
                    {String(c.expMonth).padStart(2, "0")}/{String(c.expYear).slice(-2)}
                  </div>
                </div>
              </div>
              <div className="vbadges">
                {usdc ? (
                  <>
                    <span className="vbadge usdc">USDC</span>
                    <span className="vbadge base">Base L2</span>
                  </>
                ) : (
                  <span className="vbadge visa">VISA</span>
                )}
              </div>
              <button className="vfreeze" onClick={() => toggle(c)}>
                {frozen ? "Unfreeze card" : "Freeze card"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="finehint">
        Every card spends through the same Policy Engine — limits, approvals and
        the audit trail apply automatically.
      </p>
    </div>
  );
}
