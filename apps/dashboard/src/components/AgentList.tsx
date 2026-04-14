"use client";

const agents = [
  { name: "Customer Support Bot", type: "customer-support", balance: 4200, budget: 5000, status: "ACTIVE" },
  { name: "Research Agent", type: "research", balance: 1800, budget: 3000, status: "ACTIVE" },
  { name: "Coding Assistant", type: "coding", balance: 950, budget: 3000, status: "ACTIVE" },
  { name: "Data Pipeline", type: "data", balance: 120, budget: 2000, status: "PAUSED" },
];

const statusDot: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  PAUSED: "bg-amber-500",
  REVOKED: "bg-red-500",
};

export function AgentList() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-semibold">Agent Wallets</h2>
        <button className="rounded-lg bg-vault-600 px-3 py-1 text-xs font-medium text-white hover:bg-vault-700">
          + New Agent
        </button>
      </div>

      <div className="divide-y">
        {agents.map((agent) => {
          const pct = Math.round((agent.balance / agent.budget) * 100);
          return (
            <div key={agent.name} className="px-5 py-3 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${statusDot[agent.status]}`} />
                  <p className="text-sm font-medium">{agent.name}</p>
                </div>
                <p className="text-xs text-gray-500">{agent.type}</p>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>${agent.balance.toLocaleString()}</span>
                  <span>${agent.budget.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${
                      pct > 80 ? "bg-emerald-500" : pct > 30 ? "bg-vault-500" : "bg-red-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
