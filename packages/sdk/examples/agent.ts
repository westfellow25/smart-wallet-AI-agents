/**
 * Пример: AI-агент, который покупает рекламу через AgentVault.
 *
 * Запуск (нужен работающий API и api-ключ агента из `npm run db:seed`):
 *   AGENTVAULT_KEY=av_xxx npx ts-node examples/agent.ts
 */
import { AgentVault } from "../src/index";

const vault = new AgentVault({
  apiKey: process.env.AGENTVAULT_KEY ?? "av_REPLACE_ME",
  baseUrl: process.env.AGENTVAULT_API_URL ?? "http://localhost:4000",
});

async function main() {
  // Агент "решил" запустить три рекламные кампании разного размера.
  const campaigns = [
    { amount: 15000, merchant: "Google Ads", category: "ads" }, // $150 -> APPROVED
    { amount: 30000, merchant: "Meta Ads", category: "ads" }, // $300 -> PENDING (порог $200)
    { amount: 60000, merchant: "TikTok Ads", category: "ads" }, // $600 -> BLOCKED (лимит $500)
  ];

  for (const c of campaigns) {
    const { decision, result } = await vault.spendThen(c, async () => {
      // Этот код выполнится ТОЛЬКО при APPROVED.
      return `🚀 Запустил кампанию на ${c.merchant}`;
    });

    const icon =
      decision.status === "APPROVED" ? "✅" : decision.status === "PENDING" ? "⏸" : "⛔";
    console.log(`${icon} $${(c.amount / 100).toFixed(2)} ${c.merchant} -> ${decision.status}`);
    if (decision.reason) console.log(`   ${decision.reason}`);
    if (result) console.log(`   ${result}`);
  }
}

main().catch((e) => {
  console.error("Agent error:", e.message);
  process.exit(1);
});
