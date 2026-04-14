import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo organization
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const org = await prisma.organization.create({
    data: {
      name: "Acme AI Corp",
      slug: "acme-ai-corp",
      plan: "GROWTH",
      users: {
        create: [
          {
            email: "admin@acme.ai",
            passwordHash,
            name: "Alex Admin",
            role: "OWNER",
          },
          {
            email: "member@acme.ai",
            passwordHash,
            name: "Morgan Member",
            role: "MEMBER",
          },
        ],
      },
    },
  });

  // Create wallets
  const masterWallet = await prisma.wallet.create({
    data: {
      name: "Master Wallet",
      type: "MASTER",
      currency: "USD",
      balance: 50000,
      organizationId: org.id,
    },
  });

  const supportWallet = await prisma.wallet.create({
    data: {
      name: "Support Team",
      type: "DEPARTMENT",
      currency: "USD",
      balance: 5000,
      monthlyBudget: 10000,
      dailyLimit: 500,
      perTxLimit: 100,
      organizationId: org.id,
    },
  });

  const researchWallet = await prisma.wallet.create({
    data: {
      name: "Research Agents",
      type: "AGENT",
      currency: "USD",
      balance: 3000,
      monthlyBudget: 5000,
      dailyLimit: 1000,
      perTxLimit: 250,
      organizationId: org.id,
    },
  });

  // Create agents
  const supportAgent = await prisma.agent.create({
    data: {
      name: "Customer Support Bot",
      description: "Handles customer inquiries via API calls",
      type: "customer-support",
      walletId: supportWallet.id,
      organizationId: org.id,
    },
  });

  const researchAgent = await prisma.agent.create({
    data: {
      name: "Research Agent",
      description: "Fetches data from external APIs for analysis",
      type: "research",
      walletId: researchWallet.id,
      organizationId: org.id,
    },
  });

  const codingAgent = await prisma.agent.create({
    data: {
      name: "Coding Assistant",
      description: "Uses cloud compute for code generation",
      type: "coding",
      walletId: researchWallet.id,
      organizationId: org.id,
    },
  });

  // Create policies
  const apiPolicy = await prisma.policy.create({
    data: {
      name: "API Spending Limit",
      description: "Limits individual API call costs",
      action: "BLOCK",
      rules: {
        maxAmount: 50,
        allowedCategories: ["api-call", "cloud-compute"],
      },
      organizationId: org.id,
    },
  });

  const approvalPolicy = await prisma.policy.create({
    data: {
      name: "High Value Approval",
      description: "Requires approval for transactions over $100",
      action: "REQUIRE_APPROVAL",
      rules: { maxAmount: 100 },
      organizationId: org.id,
    },
  });

  // Attach policies to agents
  await prisma.agentPolicy.createMany({
    data: [
      { agentId: supportAgent.id, policyId: apiPolicy.id },
      { agentId: researchAgent.id, policyId: approvalPolicy.id },
      { agentId: codingAgent.id, policyId: approvalPolicy.id },
    ],
  });

  // Create sample transactions
  const categories = ["api-call", "cloud-compute", "saas-subscription", "data-fetch"];
  const statuses = ["COMPLETED", "COMPLETED", "COMPLETED", "PENDING", "BLOCKED"] as const;
  const agents = [supportAgent, researchAgent, codingAgent];

  for (let i = 0; i < 25; i++) {
    const agent = agents[i % agents.length];
    const status = statuses[i % statuses.length];
    const amount = Math.round((Math.random() * 80 + 5) * 100) / 100;

    await prisma.transaction.create({
      data: {
        amount,
        type: "SPEND",
        status,
        category: categories[i % categories.length],
        description: `Auto-generated transaction #${i + 1}`,
        merchantName: ["OpenAI", "AWS", "GCP", "Anthropic", "Vercel"][i % 5],
        agentId: agent.id,
        walletId: agent.walletId,
        organizationId: org.id,
        createdAt: new Date(Date.now() - i * 3600000), // spread over last 25 hours
      },
    });
  }

  console.log("✅ Seed complete!");
  console.log(`   Organization: ${org.name} (${org.slug})`);
  console.log(`   Login: admin@acme.ai / demo1234`);
  console.log(`   Wallets: ${3} | Agents: ${3} | Policies: ${2} | Transactions: 25`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
