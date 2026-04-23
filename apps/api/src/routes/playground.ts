import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { dispatchWebhook } from "../services/webhooks";

/**
 * Playground — simulates an AI agent processing a user query.
 *
 * When the user sends a prompt, the "Research Agent" performs several steps,
 * each of which spends money via the real transaction engine:
 *   1. Reasoning call to GPT-4 ($0.05–0.15)
 *   2. (Sometimes) web search ($0.02–0.05)
 *   3. (Sometimes) vector DB lookup ($0.01–0.03)
 *   4. Synthesis call to GPT-4 ($0.10–0.25)
 *
 * Every step creates a real Transaction row, visible in the Transactions page
 * and in webhooks. The "AI" response is simulated (without an LLM key) so the
 * demo works offline.
 */

export const playgroundRouter = Router();
playgroundRouter.use(authenticate);

const askSchema = z.object({
  prompt: z.string().min(1).max(2000),
});

interface Step {
  label: string;
  merchant: string;
  category: string;
  amount: number;
  delayMs: number;
}

function planSteps(prompt: string): Step[] {
  const wordCount = prompt.split(/\s+/).length;
  const steps: Step[] = [];

  // Always: initial reasoning
  steps.push({
    label: "Reasoning with GPT-4",
    merchant: "OpenAI",
    category: "api-call",
    amount: round(0.05 + Math.random() * 0.1),
    delayMs: 800,
  });

  // Longer prompts → more retrieval
  if (wordCount > 5) {
    steps.push({
      label: "Web search for context",
      merchant: "Serper",
      category: "data-fetch",
      amount: round(0.02 + Math.random() * 0.03),
      delayMs: 400,
    });
  }

  if (prompt.toLowerCase().match(/data|analyze|report|stats|metric/)) {
    steps.push({
      label: "Querying vector database",
      merchant: "Pinecone",
      category: "data-fetch",
      amount: round(0.01 + Math.random() * 0.02),
      delayMs: 300,
    });
  }

  if (prompt.toLowerCase().match(/code|build|write|generate|create/)) {
    steps.push({
      label: "Running sandbox execution",
      merchant: "AWS",
      category: "cloud-compute",
      amount: round(0.1 + Math.random() * 0.3),
      delayMs: 600,
    });
  }

  // Always: synthesis
  steps.push({
    label: "Synthesizing answer with GPT-4",
    merchant: "OpenAI",
    category: "api-call",
    amount: round(0.1 + Math.random() * 0.15),
    delayMs: 900,
  });

  return steps;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function synthesizeResponse(prompt: string): string {
  const p = prompt.toLowerCase();

  if (p.match(/hello|hi|hey|test/)) {
    return "Hi! I'm a demonstration agent running on AgentVault. Every thinking step you saw above was a real transaction — click the Transactions tab to audit them.";
  }
  if (p.match(/price|pricing|cost|how much/)) {
    return "AgentVault has three tiers: Starter ($199/mo), Growth ($599/mo), and Enterprise ($2,000/mo). Each includes unlimited wallets, the policy engine, webhooks, and audit logs. Overage fee is 0.1% of transaction volume beyond your plan limit.";
  }
  if (p.match(/how.*work|what.*agent|explain/)) {
    return "When an AI agent needs to spend money (API call, cloud compute, SaaS), it calls AgentVault SDK. We evaluate the spend against your policies, either auto-approve, block, or queue for human review. Every decision is logged and webhook'd to your systems in real time.";
  }
  if (p.match(/data|analyze|report|metric/)) {
    return `Analyzed your query against our demo dataset. Based on the 3 data sources I queried, the key pattern is: 85% of agent spend falls into api-call and cloud-compute categories, and the top 3 merchants account for 72% of cost. This is a typical distribution for production AI-agent deployments.`;
  }
  if (p.match(/code|build|write|generate/)) {
    return `Here's a rough approach:\n\n1. Scaffold with the standard template.\n2. Add input validation at boundaries.\n3. Write a minimal test for the happy path.\n\nI consumed sandbox compute to validate the approach before responding. Full cost visible in Transactions.`;
  }
  return `Processed your request: "${prompt.slice(0, 80)}${prompt.length > 80 ? "..." : ""}". Each reasoning step above was a real transaction governed by your spending policies. Total cost for this query is shown on the right — every cent auditable.`;
}

async function getOrCreatePlaygroundAgent(orgId: string) {
  let agent = await prisma.agent.findFirst({
    where: { organizationId: orgId, type: "playground" },
    include: { wallet: true, policies: { include: { policy: true } } },
  });

  if (!agent) {
    // Pick any wallet (prefer one with budget)
    let wallet = await prisma.wallet.findFirst({
      where: { organizationId: orgId, status: "ACTIVE" },
      orderBy: { balance: "desc" },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          name: "Playground Wallet",
          type: "AGENT",
          balance: 100,
          monthlyBudget: 500,
          perTxLimit: 5,
          organizationId: orgId,
        },
      });
    }

    agent = await prisma.agent.create({
      data: {
        name: "Playground Agent",
        description: "Interactive agent for the live demo",
        type: "playground",
        walletId: wallet.id,
        organizationId: orgId,
      },
      include: { wallet: true, policies: { include: { policy: true } } },
    });
  }

  return agent;
}

playgroundRouter.post("/ask", async (req: Request, res: Response) => {
  const { prompt } = askSchema.parse(req.body);
  const orgId = req.user!.organizationId;

  const agent = await getOrCreatePlaygroundAgent(orgId);

  // Ensure wallet has funds for the demo
  if (Number(agent.wallet.balance) < 5) {
    await prisma.wallet.update({
      where: { id: agent.walletId },
      data: { balance: { increment: 50 } },
    });
  }

  const steps = planSteps(prompt);
  const createdSteps: Array<{ label: string; transaction: { id: string; amount: number; status: string; merchantName: string | null; category: string | null } }> = [];

  for (const step of steps) {
    const tx = await prisma.transaction.create({
      data: {
        amount: step.amount,
        type: "SPEND",
        status: "COMPLETED",
        category: step.category,
        description: `${step.label} — ${step.merchant}`,
        merchantName: step.merchant,
        agentId: agent.id,
        walletId: agent.walletId,
        organizationId: orgId,
        metadata: { step: step.label, playground: true } as never,
      },
    });

    await prisma.wallet.update({
      where: { id: agent.walletId },
      data: { balance: { decrement: step.amount } },
    });

    createdSteps.push({
      label: step.label,
      transaction: {
        id: tx.id,
        amount: Number(tx.amount),
        status: tx.status,
        merchantName: tx.merchantName,
        category: tx.category,
      },
    });

    dispatchWebhook({
      event: "transaction.completed",
      organizationId: orgId,
      data: { transaction: tx, source: "playground" },
    }).catch(() => {});
  }

  const totalCost = round(createdSteps.reduce((a, s) => a + s.transaction.amount, 0));
  const response = synthesizeResponse(prompt);

  res.json({
    prompt,
    response,
    steps: createdSteps,
    totalCost,
    agent: { id: agent.id, name: agent.name },
  });
});
