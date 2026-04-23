"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "▦" },
  { label: "Playground", href: "/dashboard/playground", icon: "⚡", highlight: true },
  { label: "Wallets", href: "/dashboard/wallets", icon: "▤" },
  { label: "Agents", href: "/dashboard/agents", icon: "◉" },
  { label: "Transactions", href: "/dashboard/transactions", icon: "▧" },
  { label: "Policies", href: "/dashboard/policies", icon: "⛨" },
  { label: "API Keys", href: "/dashboard/api-keys", icon: "⚷" },
  { label: "Webhooks", href: "/dashboard/webhooks", icon: "⥃" },
  { label: "Settings", href: "/dashboard/settings", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, organization, logout } = useAuth();

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-vault-600 text-sm font-bold text-white">
          AV
        </div>
        <span className="text-lg font-bold">AgentVault</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-vault-50 text-vault-700"
                  : item.highlight
                    ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="w-4 text-center text-xs">{item.icon}</span>
              {item.label}
              {item.highlight && !active && (
                <span className="ml-auto rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-900">
                  Live
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-vault-100 text-sm font-bold text-vault-700">
            {organization?.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{organization?.name}</p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
