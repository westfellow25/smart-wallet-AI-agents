import type { Agent, Transaction } from "./types";

// Демо-набор: используется, когда реальный API недоступен,
// чтобы дашборд всегда выглядел живым (демо для инвестора / скриншоты).

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const demoAgents: Agent[] = [
  { id: "a1", name: "Marketing Bot", status: "ACTIVE", createdAt: minutesAgo(6000), wallet: { balance: 74200, dailySpent: 25800, currency: "USD" } },
  { id: "a2", name: "Research Agent", status: "ACTIVE", createdAt: minutesAgo(5000), wallet: { balance: 41250, dailySpent: 8750, currency: "USD" } },
  { id: "a3", name: "DevOps Sentinel", status: "ACTIVE", createdAt: minutesAgo(4000), wallet: { balance: 138900, dailySpent: 61100, currency: "USD" } },
  { id: "a4", name: "Support Copilot", status: "PAUSED", createdAt: minutesAgo(3000), wallet: { balance: 9900, dailySpent: 100, currency: "USD" } },
];

export const demoTransactions: Transaction[] = [
  { id: "t1", amount: 30000, currency: "USD", merchant: "Meta Ads", category: "ads", status: "PENDING", reason: "Сумма $300.00 выше порога $200.00 — требуется одобрение человека", createdAt: minutesAgo(2), agent: { name: "Marketing Bot" } },
  { id: "t2", amount: 4500, currency: "USD", merchant: "OpenAI API", category: "api", status: "APPROVED", reason: null, createdAt: minutesAgo(5), agent: { name: "Research Agent" } },
  { id: "t3", amount: 60000, currency: "USD", merchant: "Coinbase", category: "crypto", status: "BLOCKED", reason: 'Категория "crypto" не разрешена политикой "Default spending policy"', createdAt: minutesAgo(9), agent: { name: "DevOps Sentinel" } },
  { id: "t4", amount: 1200, currency: "USD", merchant: "AWS", category: "compute", status: "APPROVED", reason: null, createdAt: minutesAgo(14), agent: { name: "DevOps Sentinel" } },
  { id: "t5", amount: 25000, currency: "USD", merchant: "Google Ads", category: "ads", status: "PENDING", reason: "Сумма $250.00 выше порога $200.00 — требуется одобрение человека", createdAt: minutesAgo(19), agent: { name: "Marketing Bot" } },
  { id: "t6", amount: 8000, currency: "USD", merchant: "Notion", category: "saas", status: "APPROVED", reason: null, createdAt: minutesAgo(26), agent: { name: "Support Copilot" } },
  { id: "t7", amount: 90000, currency: "USD", merchant: "Unknown Vendor", category: "ads", status: "BLOCKED", reason: "Сумма $900.00 превышает лимит на транзакцию $500.00", createdAt: minutesAgo(33), agent: { name: "Marketing Bot" } },
  { id: "t8", amount: 3300, currency: "USD", merchant: "Anthropic API", category: "api", status: "APPROVED", reason: null, createdAt: minutesAgo(41), agent: { name: "Research Agent" } },
  { id: "t9", amount: 15000, currency: "USD", merchant: "LinkedIn Ads", category: "ads", status: "APPROVED", reason: null, createdAt: minutesAgo(52), agent: { name: "Marketing Bot" } },
  { id: "t10", amount: 7600, currency: "USD", merchant: "Vercel", category: "saas", status: "APPROVED", reason: null, createdAt: minutesAgo(68), agent: { name: "DevOps Sentinel" } },
];
