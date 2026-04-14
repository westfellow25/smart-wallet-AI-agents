"use client";

import { Sidebar } from "@/components/Sidebar";
import { KPIRow } from "@/components/KPIRow";
import { TransactionFeed } from "@/components/TransactionFeed";
import { AgentList } from "@/components/AgentList";

export default function DashboardPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Monitor your AI agent spending in real-time</p>
        </div>

        <KPIRow />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TransactionFeed />
          </div>
          <div>
            <AgentList />
          </div>
        </div>
      </main>
    </div>
  );
}
