"use client";

import { Overview } from "@/lib/api";

interface Props {
  overview: Overview | null;
}

export function KPIRow({ overview }: Props) {
  const kpis = overview
    ? [
        {
          label: "Spent this month",
          value: `$${overview.totalSpent.toFixed(2)}`,
          change: overview.spendChange ? `${overview.spendChange > 0 ? "+" : ""}${overview.spendChange}%` : "",
          up: overview.spendChange >= 0,
        },
        { label: "Active agents", value: String(overview.activeAgents), change: "", up: true },
        { label: "Transactions", value: overview.totalTransactions.toLocaleString(), change: "", up: true },
        { label: "Blocked", value: String(overview.blockedCount), change: "", up: false },
        { label: "Budget used", value: `${overview.budgetUsedPct}%`, change: "", up: true },
      ]
    : [];

  if (!overview) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border bg-white p-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
          <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
          {kpi.change && (
            <p className={`mt-1 text-xs font-medium ${kpi.up ? "text-emerald-600" : "text-red-500"}`}>
              {kpi.change} vs last month
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
