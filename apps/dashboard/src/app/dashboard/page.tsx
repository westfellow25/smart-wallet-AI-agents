"use client";

import { useEffect, useState } from "react";
import { api, Overview, DailyPoint, CategoryStat, Transaction } from "@/lib/api";
import { KPIRow } from "@/components/KPIRow";
import { TransactionFeed } from "@/components/TransactionFeed";
import { SpendChart } from "@/components/SpendChart";
import { CategoryDonut } from "@/components/CategoryDonut";

export default function DashboardHomePage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    api.overview().then(setOverview).catch(console.error);
    api.daily(7).then((r) => setDaily(r.daily)).catch(console.error);
    api.byCategory().then((r) => setCategories(r.categories)).catch(console.error);
    api.listTransactions({ limit: "10" }).then((r) => setTransactions(r.transactions)).catch(console.error);
  }, []);

  async function handleReview(id: string, action: "approve" | "reject") {
    try {
      await api.reviewTransaction(id, action);
      const r = await api.listTransactions({ limit: "10" });
      setTransactions(r.transactions);
      const o = await api.overview();
      setOverview(o);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500">Monitor your AI agent spending in real-time</p>
      </div>

      <KPIRow overview={overview} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold">Spend — last 7 days</h2>
          <SpendChart data={daily} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">By category</h2>
          <CategoryDonut data={categories} />
        </div>
      </div>

      <div className="mt-6">
        <TransactionFeed transactions={transactions} onReview={handleReview} />
      </div>
    </div>
  );
}
