"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Plan } from "@/lib/api";

export default function LandingPage() {
  const [plans, setPlans] = useState<Record<string, Plan> | null>(null);

  useEffect(() => {
    api.plans().then((r) => setPlans(r.plans)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="flex h-16 items-center justify-between border-b px-6 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-vault-600 text-sm font-bold text-white">
            AV
          </div>
          <span className="text-lg font-bold">AgentVault</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-vault-600 px-4 py-2 text-sm font-medium text-white hover:bg-vault-700"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center lg:py-32">
        <div className="mb-4 inline-flex rounded-full bg-vault-50 px-3 py-1 text-xs font-medium text-vault-700">
          Infrastructure for the AI agent economy
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight lg:text-6xl">
          The corporate wallet <br />
          <span className="text-vault-600">for your AI agents.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Set budgets, enforce spending policies, approve high-value transactions, and audit
          every dollar your AI agents spend — in real-time.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-vault-600 px-6 py-3 text-sm font-medium text-white hover:bg-vault-700"
          >
            Start free 14-day trial
          </Link>
          <a
            href="#pricing"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View pricing
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="border-y bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-2 text-center text-3xl font-bold">Everything you need to deploy AI agents safely</h2>
          <p className="mb-12 text-center text-gray-600">
            Four layers of control, built on battle-tested infrastructure.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Per-agent wallets",
                desc: "Isolated budgets for every agent. Master wallet, department sub-wallets, per-agent limits.",
                icon: "\u25A6",
              },
              {
                title: "Policy Engine",
                desc: "Spending rules: max amounts, allowed merchants, time windows. Block or flag in real-time.",
                icon: "\u26E8",
              },
              {
                title: "Human approvals",
                desc: "High-value transactions pause until a human approves them. Slack/email notifications.",
                icon: "\u2713",
              },
              {
                title: "Full audit trail",
                desc: "Every spend, block, and approval logged. SOC2-ready. Exportable for compliance.",
                icon: "\u25EF",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border bg-white p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-vault-50 text-xl text-vault-600">
                  {f.icon}
                </div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-2 text-center text-3xl font-bold">Simple, transparent pricing</h2>
          <p className="mb-12 text-center text-gray-600">14-day free trial. No credit card required.</p>

          <div className="grid gap-6 md:grid-cols-3">
            {plans &&
              Object.entries(plans).map(([key, plan], i) => (
                <div
                  key={key}
                  className={`rounded-2xl border p-8 ${
                    i === 1 ? "border-vault-600 bg-vault-50 shadow-lg" : "bg-white"
                  }`}
                >
                  {i === 1 && (
                    <div className="mb-3 inline-block rounded-full bg-vault-600 px-3 py-0.5 text-xs font-medium text-white">
                      Most popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-gray-500">/mo</span>
                  </div>
                  <ul className="mt-6 space-y-2 text-sm">
                    <li>
                      {plan.agents === -1 ? "Unlimited" : plan.agents} agents
                    </li>
                    <li>
                      {plan.transactions === -1
                        ? "Unlimited"
                        : `${plan.transactions.toLocaleString()}/mo`}{" "}
                      transactions
                    </li>
                    <li>Full policy engine</li>
                    <li>Audit log & webhooks</li>
                    {i >= 1 && <li>Priority support</li>}
                    {i >= 2 && <li>SSO & custom SLAs</li>}
                  </ul>
                  <Link
                    href="/register"
                    className={`mt-8 block rounded-lg py-2.5 text-center text-sm font-medium ${
                      i === 1
                        ? "bg-vault-600 text-white hover:bg-vault-700"
                        : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Start free trial
                  </Link>
                </div>
              ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} AgentVault. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
