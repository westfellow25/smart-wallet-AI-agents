"use client";

import { Transaction } from "@/lib/api";

const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  BLOCKED: "bg-red-100 text-red-700",
  FAILED: "bg-gray-200 text-gray-700",
};

interface Props {
  transactions: Transaction[];
  onReview?: (id: string, action: "approve" | "reject") => void;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function TransactionFeed({ transactions, onReview }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-semibold">Recent Transactions</h2>
      </div>

      <div className="divide-y">
        {transactions.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No transactions yet</div>
        )}
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                {(tx.agent?.name || "?").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{tx.agent?.name || "Unknown agent"}</p>
                <p className="text-xs text-gray-500">
                  {tx.merchantName || tx.description || "—"}
                  {tx.category && ` · ${tx.category}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[tx.status]}`}>
                {tx.status}
              </span>
              <div className="text-right">
                <p className="text-sm font-semibold">${Number(tx.amount).toFixed(2)}</p>
                <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
              </div>
              {tx.status === "PENDING" && onReview && (
                <div className="flex gap-1">
                  <button
                    onClick={() => onReview(tx.id, "approve")}
                    className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    \u2713
                  </button>
                  <button
                    onClick={() => onReview(tx.id, "reject")}
                    className="rounded-md bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
                  >
                    \u2715
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
