"use client";

import { useEffect, useState } from "react";
import { api, Transaction } from "@/lib/api";

const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  BLOCKED: "bg-red-100 text-red-700",
  FAILED: "bg-gray-200 text-gray-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
};

const FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Pending", value: "PENDING" },
  { label: "Blocked", value: "BLOCKED" },
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params: Record<string, string> = { limit: "100" };
    if (filter) params.status = filter;
    const r = await api.listTransactions(params);
    setTransactions(r.transactions);
    setTotal(r.total);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function review(id: string, action: "approve" | "reject") {
    try {
      await api.reviewTransaction(id, action);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-sm text-gray-500">{total} transactions</p>
      </div>

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              filter === f.value ? "bg-vault-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Agent</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Merchant</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>
            )}
            {!loading && transactions.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No transactions</td></tr>
            )}
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium">{tx.agent?.name || "—"}</td>
                <td className="px-5 py-3 font-semibold">${Number(tx.amount).toFixed(2)}</td>
                <td className="px-5 py-3 text-gray-600">{tx.category || "—"}</td>
                <td className="px-5 py-3 text-gray-600">{tx.merchantName || "—"}</td>
                <td className="px-5 py-3">
                  <span className={`pill ${statusColors[tx.status]}`}>{tx.status}</span>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {new Date(tx.createdAt).toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right">
                  {tx.status === "PENDING" && (
                    <div className="flex justify-end gap-1">
                      <button onClick={() => review(tx.id, "approve")} className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                        Approve
                      </button>
                      <button onClick={() => review(tx.id, "reject")} className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600">
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
