# @agentvault/sdk

Official JS/TS SDK for **AgentVault** — let your AI agents spend money safely.

```ts
import { AgentVault } from "@agentvault/sdk";

const vault = new AgentVault({ apiKey: process.env.AGENTVAULT_KEY! });

const decision = await vault.spend({
  amount: 15000,            // в центах = $150.00
  merchant: "Google Ads",
  category: "ads",
});

if (decision.approved) {
  runCampaign();            // деньги списаны, политики пройдены
} else if (decision.pending) {
  console.log("Ждём одобрения человека:", decision.reason);
} else {
  console.log("Заблокировано политикой:", decision.reason);
}
```

Или guard-стиль — действие выполнится только при одобрении:

```ts
const { decision, result } = await vault.spendThen(
  { amount: 15000, merchant: "Google Ads", category: "ads" },
  () => runCampaign()
);
```

См. полный пример: [`examples/agent.ts`](./examples/agent.ts).
