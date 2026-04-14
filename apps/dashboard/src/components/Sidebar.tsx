"use client";

const navItems = [
  { label: "Dashboard", icon: "grid", active: true },
  { label: "Wallets", icon: "wallet" },
  { label: "Agents", icon: "bot" },
  { label: "Transactions", icon: "receipt" },
  { label: "Policies", icon: "shield" },
  { label: "API Keys", icon: "key" },
  { label: "Settings", icon: "settings" },
];

export function Sidebar() {
  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-vault-600 text-sm font-bold text-white">
          AV
        </div>
        <span className="text-lg font-bold">AgentVault</span>
      </div>

      <nav className="flex-1 px-3 py-4">
        {navItems.map((item) => (
          <a
            key={item.label}
            href="#"
            className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              item.active
                ? "bg-vault-50 text-vault-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span className="text-xs">{item.icon === "grid" ? "\u25A6" : "\u2022"}</span>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-vault-100 text-xs font-bold text-vault-700">
            AA
          </div>
          <div>
            <p className="text-sm font-medium">Acme AI Corp</p>
            <p className="text-xs text-gray-500">Growth Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
