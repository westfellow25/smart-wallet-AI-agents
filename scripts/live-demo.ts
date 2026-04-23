/**
 * Live transaction simulator — creates transactions every few seconds
 * so the dashboard feels alive during a live investor demo.
 *
 * Usage: from apps/api directory
 *   npx ts-node ../../scripts/live-demo.ts
 *
 * Or via npm: npm run demo:live  (from repo root)
 */

const API_URL = process.env.API_URL || "http://localhost:3001";
const INTERVAL_MS = Number(process.env.INTERVAL_MS || 4000);

const EMAIL = "admin@acme.ai";
const PASSWORD = "demo1234";

const MERCHANTS = ["OpenAI", "Anthropic", "AWS", "Google Cloud", "Vercel", "Stripe", "Datadog", "Snowflake"];
const CATEGORIES = [
  { name: "api-call", min: 0.5, max: 8 },
  { name: "cloud-compute", min: 5, max: 45 },
  { name: "data-fetch", min: 1, max: 15 },
  { name: "storage", min: 0.2, max: 5 },
];

// ~10% of transactions will try a high amount to trigger approval flow
// ~5% will try a blocked category
function pickScenario() {
  const roll = Math.random();
  if (roll < 0.05) return "blocked" as const;
  if (roll < 0.15) return "approval" as const;
  return "normal" as const;
}

function pickCategory() {
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
}

function pickMerchant() {
  return MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
}

function randomAmount(min: number, max: number) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

async function login(): Promise<string> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const body = (await res.json()) as { token: string };
  return body.token;
}

async function listAgents(token: string): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(`${API_URL}/api/v1/agents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as { agents: Array<{ id: string; name: string }> };
  return body.agents;
}

async function submitTransaction(
  token: string,
  agentId: string,
  scenario: "normal" | "approval" | "blocked",
) {
  const cat = pickCategory();
  let amount: number;
  let category = cat.name;

  if (scenario === "approval") {
    amount = randomAmount(150, 400);
    category = "cloud-compute";
  } else if (scenario === "blocked") {
    amount = randomAmount(5, 15);
    category = "gambling";
  } else {
    amount = randomAmount(cat.min, cat.max);
  }

  const merchant = pickMerchant();

  const res = await fetch(`${API_URL}/api/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount,
      agentId,
      category,
      merchantName: merchant,
      description: `${category} — ${merchant}`,
    }),
  });

  const body = (await res.json()) as { transaction?: { status: string }; blocked?: boolean; requiresApproval?: boolean };

  const now = new Date().toTimeString().slice(0, 8);
  const status = body.blocked ? "BLOCKED" : body.requiresApproval ? "PENDING" : body.transaction?.status || "—";
  const icon =
    status === "COMPLETED" ? "\x1b[32m✓\x1b[0m" :
    status === "PENDING" ? "\x1b[33m⧖\x1b[0m" :
    status === "BLOCKED" ? "\x1b[31m✗\x1b[0m" : "·";

  console.log(`${now}  ${icon}  $${amount.toFixed(2).padStart(7)}  ${category.padEnd(16)}  ${merchant.padEnd(13)}  [${status}]`);
}

async function main() {
  console.log(`\n🎬 AgentVault live demo — interval ${INTERVAL_MS}ms\n`);

  const token = await login();
  const agents = await listAgents(token);
  if (agents.length === 0) {
    console.error("No agents found. Run ./scripts/demo-start.sh first.");
    process.exit(1);
  }
  console.log(`Loaded ${agents.length} agents. Simulating traffic...\n`);
  console.log("Time      ?   Amount   Category          Merchant       Status");
  console.log("─".repeat(75));

  let tick = 0;
  const loop = async () => {
    tick++;
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const scenario = pickScenario();
    try {
      await submitTransaction(token, agent.id, scenario);
    } catch (err) {
      console.error(`Tick ${tick} failed:`, (err as Error).message);
    }
  };

  await loop();
  setInterval(loop, INTERVAL_MS);
}

process.on("SIGINT", () => {
  console.log("\n\nSimulation stopped.");
  process.exit(0);
});

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
