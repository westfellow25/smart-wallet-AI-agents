"use client";

const transactions = [
  { id: "1", agent: "Support Bot", amount: 4.20, category: "api-call", merchant: "OpenAI", status: "COMPLETED", time: "2 min ago" },
  { id: "2", agent: "Research Agent", amount: 12.50, category: "cloud-compute", merchant: "AWS", status: "COMPLETED", time: "8 min ago" },
  { id: "3", agent: "Coding Assistant", amount: 150.00, category: "cloud-compute", merchant: "GCP", status: "PENDING", time: "15 min ago" },
  { id: "4", agent: "Support Bot", amount: 3.80, category: "api-call", merchant: "Anthropic", status: "COMPLETED", time: "22 min ago" },
  { id: "5", agent: "Research Agent", amount: 500.00, category: "data-fetch", merchant: "Bloomberg", status: "BLOCKED", time: "1 hour ago" },
  { id: "6", agent: "Coding Assistant", amount: 8.90, category: "api-call", merchant: "OpenAI", status: "COMPLETED", time: "1 hour ago" },
  { id: "7", agent: "Support Bot", amount: 2.10, category: "api-call", merchant: "Anthropic", status: "COMPLETED", time: "2 hours ago" },
];

const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  BLOCKED: "bg-red-100 text-red-700",
};

export function TransactionFeed() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-semibold">Recent Transactions</h2>
        <div className="flex gap-2">
          {["All", "Approved", "Pending", "Blocked"].map((f) => (
            <button
              key={f}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${
                f === "All"
                  ? "bg-vault-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                {tx.agent.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{tx.agent}</p>
                <p className="text-xs text-gray-500">
                  {tx.merchant} &middot; {tx.category}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[tx.status]}`}>
                {tx.status}
              </span>
              <div className="text-right">
                <p className="text-sm font-semibold">${tx.amount.toFixed(2)}</p>
                <p className="text-xs text-gray-400">{tx.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
