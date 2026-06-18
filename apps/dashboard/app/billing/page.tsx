"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/format";

type Plan = {
  plan: "FREE" | "STARTER" | "GROWTH" | "SCALE";
  name: string;
  priceMonthly: number;
  maxAgents: number | null;
  monthlyVolume: number | null;
  highlights: string[];
};

type Subscription = {
  plan: string;
  status: string;
  usage?: { agents: number; agentsLimit: number | null };
  stripeEnabled?: boolean;
};

const ORDER = ["FREE", "STARTER", "GROWTH", "SCALE"];

export default function Billing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [source, setSource] = useState<"live" | "demo">("demo");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/billing", { cache: "no-store" });
    const data = await res.json();
    setPlans(data.plans ?? []);
    setSub(data.subscription ?? null);
    setSource(data.source ?? "demo");
  }
  useEffect(() => {
    load();
  }, []);

  async function upgrade(plan: string) {
    setBusy(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // реальный Stripe Checkout
        return;
      }
      await load(); // dev-режим: тариф применился сразу
    } finally {
      setBusy(null);
    }
  }

  const currentIdx = sub ? ORDER.indexOf(sub.plan) : 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">AV</div>
          <div>
            <h1>AgentVault — Billing</h1>
            <p>Plans &amp; subscription</p>
          </div>
        </div>
        <nav className="nav">
          <Link href="/">Control Tower</Link>
          <span className="active">Billing</span>
        </nav>
        <div className="source-pill">
          <span className={`dot ${source === "demo" ? "demo" : ""}`} />
          {source === "live" ? "Live" : "Demo data"}
        </div>
      </header>

      {sub && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="current-plan">
            <div>
              <div className="label">Current plan</div>
              <div className="big">
                {sub.plan} <span className={`badge ${sub.status === "ACTIVE" ? "APPROVED" : "PENDING"}`}>{sub.status}</span>
              </div>
            </div>
            {sub.usage && (
              <div>
                <div className="label">Agents</div>
                <div className="big">
                  {sub.usage.agents}
                  <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                    {" "}/ {sub.usage.agentsLimit ?? "∞"}
                  </span>
                </div>
              </div>
            )}
            <div>
              <div className="label">Billing engine</div>
              <div className="big" style={{ fontSize: 18 }}>
                {sub.stripeEnabled ? "Stripe (live)" : "Dev mode"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pricing">
        {plans
          .slice()
          .sort((a, b) => ORDER.indexOf(a.plan) - ORDER.indexOf(b.plan))
          .map((p) => {
            const idx = ORDER.indexOf(p.plan);
            const isCurrent = sub?.plan === p.plan;
            const isDowngrade = idx < currentIdx;
            const popular = p.plan === "GROWTH";
            return (
              <div className={`price-card ${popular ? "popular" : ""} ${isCurrent ? "current" : ""}`} key={p.plan}>
                {popular && <div className="ribbon">Most popular</div>}
                <div className="pname">{p.name}</div>
                <div className="pprice">
                  {p.priceMonthly === 0 ? "$0" : money(p.priceMonthly)}
                  <span>/mo</span>
                </div>
                <ul className="features">
                  {p.highlights.map((h) => (
                    <li key={h}>✓ {h}</li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button className="pbtn current" disabled>
                    Current plan
                  </button>
                ) : p.plan === "FREE" || isDowngrade ? (
                  <button className="pbtn ghost" disabled>
                    {isDowngrade ? "Downgrade" : "—"}
                  </button>
                ) : (
                  <button
                    className="pbtn"
                    disabled={busy === p.plan}
                    onClick={() => upgrade(p.plan)}
                  >
                    {busy === p.plan ? "…" : `Upgrade to ${p.name}`}
                  </button>
                )}
              </div>
            );
          })}
      </div>

      <p className="finehint">
        {sub?.stripeEnabled
          ? "Upgrades open Stripe Checkout. Cancel anytime."
          : "Dev mode: upgrades apply instantly without payment. Set STRIPE_SECRET_KEY to enable real billing."}
      </p>
    </div>
  );
}
