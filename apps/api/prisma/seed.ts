import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Чистим (порядок важен из-за внешних ключей; Cascade упрощает).
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: { name: "Acme AI Inc." },
  });

  // Политика: до $500 за транзакцию, $2000 в день,
  // одобрение человека на всё дороже $200, только разрешённые категории.
  await prisma.policy.create({
    data: {
      orgId: org.id,
      name: "Default spending policy",
      maxPerTransaction: 50000, // $500
      dailyLimit: 200000, // $2000
      requireApprovalOver: 20000, // $200
      allowedCategories: ["ads", "api", "saas", "compute"],
    },
  });

  // Агент с кошельком на $1000.
  const apiKey = "av_" + randomBytes(24).toString("hex");
  const agent = await prisma.agent.create({
    data: {
      orgId: org.id,
      name: "Marketing Bot",
      apiKey,
      wallet: { create: { orgId: org.id, balance: 100000, currency: "USD" } },
    },
  });

  // Виртуальная USDC-карта на Base L2 для демо-агента.
  await prisma.virtualCard.create({
    data: {
      orgId: org.id,
      agentId: agent.id,
      network: "USDC_BASE",
      last4: "4242",
      expMonth: 12,
      expYear: new Date().getUTCFullYear() + 3,
    },
  });

  // Второй агент — чтобы демонстрировать agent-to-agent платежи.
  const agent2Key = "av_" + randomBytes(24).toString("hex");
  const agent2 = await prisma.agent.create({
    data: {
      orgId: org.id,
      name: "Data Provider Agent",
      apiKey: agent2Key,
      wallet: { create: { orgId: org.id, balance: 20000, currency: "USD" } },
    },
  });

  // Демо A2A-перевод: Marketing Bot платит Data Provider $25 за датасет.
  await prisma.transfer.create({
    data: {
      orgId: org.id,
      fromAgentId: agent.id,
      toAgentId: agent2.id,
      amount: 2500,
      memo: "Датасет аудитории Q2",
      category: "a2a",
      status: "APPROVED",
    },
  });

  // Демо счёт: Data Provider выставляет Marketing Bot $40.
  await prisma.paymentRequest.create({
    data: {
      orgId: org.id,
      payeeAgentId: agent2.id,
      payerAgentId: agent.id,
      amount: 4000,
      memo: "API-доступ к данным, 1000 запросов",
      category: "a2a",
    },
  });

  console.log("\nSeed готов. Сохрани эти значения для теста API:\n");
  console.log("  AGENT2_KEY =", agent2Key, "(Data Provider Agent)");
  console.log("  ORG_ID     =", org.id);
  console.log("  AGENT_ID   =", agent.id);
  console.log("  AGENT_KEY  =", apiKey);
  console.log("\nПример: агент тратит $150 на рекламу (пройдёт как APPROVED):");
  console.log(
    `  curl -X POST http://localhost:4000/v1/transactions \\\n` +
      `    -H "Authorization: Bearer ${apiKey}" \\\n` +
      `    -H "Content-Type: application/json" \\\n` +
      `    -d '{"amount":15000,"merchant":"Google Ads","category":"ads"}'`
  );
  console.log("\nПример: $300 на рекламу -> PENDING (выше порога $200):");
  console.log(
    `  curl -X POST http://localhost:4000/v1/transactions \\\n` +
      `    -H "Authorization: Bearer ${apiKey}" \\\n` +
      `    -H "Content-Type: application/json" \\\n` +
      `    -d '{"amount":30000,"merchant":"Meta Ads","category":"ads"}'`
  );
  console.log("\nСписок pending для одобрения (нужен ORG_ID):");
  console.log(
    `  curl http://localhost:4000/v1/transactions?status=PENDING -H "x-org-id: ${org.id}"\n`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
