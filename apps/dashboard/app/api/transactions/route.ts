import { NextResponse } from "next/server";
import { fetchTransactions, fetchAgents, isConfigured } from "@/lib/api";
import { demoTransactions, demoAgents } from "@/lib/demoData";

// GET /api/transactions — отдаёт транзакции + агентов одним вызовом.
// Падает обратно на демо-данные, если API недоступен.
export async function GET() {
  if (await isConfigured()) {
    try {
      const [transactions, agents] = await Promise.all([
        fetchTransactions(),
        fetchAgents(),
      ]);
      return NextResponse.json({ transactions, agents, source: "live" });
    } catch {
      // упадём в демо ниже
    }
  }
  return NextResponse.json({
    transactions: demoTransactions,
    agents: demoAgents,
    source: "demo",
  });
}
