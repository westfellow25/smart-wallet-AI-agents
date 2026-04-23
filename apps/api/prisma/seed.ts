import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Tunable constants for a demo that looks alive
const DAYS_OF_HISTORY = 7;
const TX_PER_DAY = 12; // 84 over 7 days
const PENDING_APPROVALS = 3;

const merchants = [
  "OpenAI",
  "Anthropic",
  "AWS",
  "Google Cloud",
  "Vercel",
  "Stripe",
  "SendGrid",
  "Twilio",
  "Datadog",
  "Snowflake",
];

const categoryMix: Array<{ category: string; weight: number; minAmount: number; maxAmount: number }> = [
  { category: "api-call", weight: 5, minAmount: 0.5, maxAmount: 8 },
  { category: "cloud-compute", weight: 3, minAmount: 5, maxAmount: 45 },
  { category: "saas-subscription", weight: 1, minAmount: 20, maxAmount: 80 },
  { category: "data-fetch", weight: 2, minAmount: 1, maxAmount: 15 },
  { category: "storage", weight: 1, minAmount: 0.2, maxAmount: 5 },
];

function pickCategory() {
  const total = categoryMix.reduce((a, b) => a + b.weight, 0);
  let r = Math.random() * total;
  for (const c of categoryMix) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return categoryMix[0];
}

async function wipeOrg(orgId: string) {
  await prisma.approval.deleteMany({ where: { transaction: { organizationId: orgId } } });
  await prisma.transaction.deleteMany({ where: { organizationId: orgId } });
  await prisma.agentPolicy.deleteMany({ where: { agent: { organizationId: orgId } } });
  await prisma.policy.deleteMany({ where: { organizationId: orgId } });
  await prisma.agent.deleteMany({ where: { organizationId: orgId } });
  await prisma.apiKey.deleteMany({ where: { organizationId: orgId } });
  await prisma.wallet.deleteMany({ where: { organizationId: orgId } });
  await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
  await prisma.webhook.deleteMany({ where: { organizationId: orgId } });
  await prisma.user.deleteMany({ where: { organizationId: orgId } });
  await prisma.organization.delete({ where: { id: orgId } });
}

async function main() {
  console.log("🌱 Seeding demo data...");

  // Clean previous demo org (idempotent)
  const existing = await prisma.organization.findUnique({ where: { slug: "acme-ai-corp" } });
  if (existing) {
    console.log("   Removing previous demo data...");
    await wipeOrg(existing.id);
  }

  const passwordHash = await bcrypt.hash("demo1234", 12);

  const org = await prisma.organization.create({
    data: {
      name: "Acme AI Corp",
      slug: "acme-ai-corp",
      plan: "GROWTH",
      subscriptionStatus: "active",
      users: {
        create: [
          { email: "admin@acme.ai", passwordHash, name: "Alex Admin", role: "OWNER" },
          { email: "member@acme.ai", passwordHash, name: "Morgan Member", role: "MEMBER" },
        ],
      },
    },
  });

  // ─── Wallets ─────────────────────────────────────────────
  const masterWallet = await prisma.wallet.create({
    data: {
      name: "Master Wallet",
      type: "MASTER",
      currency: "USD",
      balance: 87_500,
      organizationId: org.id,
    },
  });

  const supportWallet = await prisma.wallet.create({
    data: {
      name: "Support Team",
      type: "DEPARTMENT",
      balance: 4_850,
      monthlyBudget: 10_000,
      dailyLimit: 500,
      perTxLimit: 100,
      organizationId: org.id,
    },
  });

  const researchWallet = await prisma.wallet.create({
    data: {
      name: "Research Agents",
      type: "AGENT",
      balance: 2_640,
      monthlyBudget: 5_000,
      dailyLimit: 1_000,
      perTxLimit: 250,
      organizationId: org.id,
    },
  });

  const devWallet = await prisma.wallet.create({
    data: {
      name: "DevOps Automation",
      type: "DEPARTMENT",
      balance: 9_320,
      monthlyBudget: 15_000,
      dailyLimit: 2_000,
      perTxLimit: 500,
      organizationId: org.id,
    },
  });

  const salesWallet = await prisma.wallet.create({
    data: {
      name: "Sales Outreach",
      type: "DEPARTMENT",
      balance: 1_240,
      monthlyBudget: 3_000,
      dailyLimit: 300,
      perTxLimit: 50,
      organizationId: org.id,
    },
  });

  // ─── Agents ──────────────────────────────────────────────
  const agents = await Promise.all([
    prisma.agent.create({
      data: {
        name: "Customer Support Bot",
        description: "Handles L1 inquiries via API, forwards complex to humans",
        type: "customer-support",
        walletId: supportWallet.id,
        organizationId: org.id,
      },
    }),
    prisma.agent.create({
      data: {
        name: "Research Agent v2",
        description: "Fetches market data, summarizes, creates reports",
        type: "research",
        walletId: researchWallet.id,
        organizationId: org.id,
      },
    }),
    prisma.agent.create({
      data: {
        name: "Coding Assistant",
        description: "Writes PRs, reviews code, runs tests on cloud compute",
        type: "coding",
        walletId: devWallet.id,
        organizationId: org.id,
      },
    }),
    prisma.agent.create({
      data: {
        name: "Data Pipeline Bot",
        description: "ETL jobs, Snowflake queries, data validation",
        type: "data",
        walletId: devWallet.id,
        organizationId: org.id,
      },
    }),
    prisma.agent.create({
      data: {
        name: "Sales Outreach",
        description: "Sends personalized emails, enriches leads",
        type: "sales",
        walletId: salesWallet.id,
        organizationId: org.id,
      },
    }),
  ]);

  // ─── Policies ────────────────────────────────────────────
  const apiPolicy = await prisma.policy.create({
    data: {
      name: "API Spending Cap",
      description: "Limits per-call API costs to prevent runaway spend",
      action: "BLOCK",
      rules: { maxAmount: 50, allowedCategories: ["api-call", "cloud-compute", "data-fetch"] },
      organizationId: org.id,
    },
  });

  const approvalPolicy = await prisma.policy.create({
    data: {
      name: "High-Value Approval",
      description: "Require human approval for transactions over $100",
      action: "REQUIRE_APPROVAL",
      rules: { maxAmount: 100 },
      organizationId: org.id,
    },
  });

  const gamblingPolicy = await prisma.policy.create({
    data: {
      name: "Blocked Categories",
      description: "Block high-risk or non-business categories",
      action: "BLOCK",
      rules: { blockedCategories: ["gambling", "crypto-trade", "personal"] },
      organizationId: org.id,
    },
  });

  const businessHoursPolicy = await prisma.policy.create({
    data: {
      name: "Business Hours Only (Sales)",
      description: "Sales outreach restricted to 9-18 UTC",
      action: "REQUIRE_APPROVAL",
      rules: { timeWindow: { startHour: 9, endHour: 18, timezone: "UTC" } },
      organizationId: org.id,
    },
  });

  // Attach policies
  await prisma.agentPolicy.createMany({
    data: [
      { agentId: agents[0].id, policyId: apiPolicy.id },
      { agentId: agents[0].id, policyId: gamblingPolicy.id },
      { agentId: agents[1].id, policyId: approvalPolicy.id },
      { agentId: agents[1].id, policyId: apiPolicy.id },
      { agentId: agents[2].id, policyId: approvalPolicy.id },
      { agentId: agents[3].id, policyId: apiPolicy.id },
      { agentId: agents[4].id, policyId: businessHoursPolicy.id },
    ],
  });

  // ─── Transactions ────────────────────────────────────────
  // Spread over N days, last day has more activity
  const now = Date.now();
  let txCount = 0;
  let blockedCount = 0;

  for (let day = DAYS_OF_HISTORY - 1; day >= 0; day--) {
    const txToday = day === 0 ? Math.round(TX_PER_DAY * 1.5) : TX_PER_DAY;

    for (let i = 0; i < txToday; i++) {
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const cat = pickCategory();
      const amount = Math.round((cat.minAmount + Math.random() * (cat.maxAmount - cat.minAmount)) * 100) / 100;
      const merchant = merchants[Math.floor(Math.random() * merchants.length)];

      // ~5% blocked, ~85% completed, ~10% pending (but we'll add dedicated pending at end)
      const roll = Math.random();
      let status: "COMPLETED" | "BLOCKED" | "PENDING" = "COMPLETED";
      if (roll < 0.05) {
        status = "BLOCKED";
        blockedCount++;
      }

      const hoursAgo = day * 24 + Math.random() * 24;
      const createdAt = new Date(now - hoursAgo * 3_600_000);

      await prisma.transaction.create({
        data: {
          amount,
          type: "SPEND",
          status,
          category: cat.category,
          merchantName: merchant,
          description: `${cat.category} — ${merchant}`,
          metadata: status === "BLOCKED" ? { blockReason: "Exceeded policy limit" } : undefined,
          agentId: agent.id,
          walletId: agent.walletId,
          organizationId: org.id,
          createdAt,
        },
      });
      txCount++;
    }
  }

  // ─── Dedicated PENDING approvals (for demo "click approve" moment) ──
  for (let i = 0; i < PENDING_APPROVALS; i++) {
    const agent = agents[i % agents.length];
    const amount = 150 + Math.round(Math.random() * 350);
    await prisma.transaction.create({
      data: {
        amount,
        type: "SPEND",
        status: "PENDING",
        category: "cloud-compute",
        merchantName: merchants[i % merchants.length],
        description: `High-value GPU job requiring approval`,
        agentId: agent.id,
        walletId: agent.walletId,
        organizationId: org.id,
        createdAt: new Date(now - (i + 1) * 20 * 60_000),
        approval: { create: { status: "PENDING" } },
      },
    });
    txCount++;
  }

  console.log("");
  console.log("✅ Seed complete!");
  console.log("");
  console.log(`   Organization:    ${org.name} (${org.slug})`);
  console.log(`   Login:           admin@acme.ai / demo1234`);
  console.log(`   Wallets:         5`);
  console.log(`   Agents:          ${agents.length}`);
  console.log(`   Policies:        4`);
  console.log(`   Transactions:    ${txCount} (${blockedCount} blocked, ${PENDING_APPROVALS} pending approval)`);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
