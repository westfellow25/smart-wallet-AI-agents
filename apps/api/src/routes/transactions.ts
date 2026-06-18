import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { agentAuth } from "../middleware/agentAuth";
import { requireOrg } from "../middleware/orgContext";
import { evaluate } from "../lib/policyEngine";
import { notifyPending } from "../lib/notify";

export const transactionsRouter = Router();

const spendSchema = z.object({
  amount: z.number().int().positive(), // в центах
  merchant: z.string().min(1),
  category: z.string().min(1),
});

/**
 * POST /v1/transactions
 * Агент инициирует трату. Проходит через Policy Engine.
 * Аутентификация — по API-ключу агента (Authorization: Bearer av_...).
 */
transactionsRouter.post("/", agentAuth, async (req, res) => {
  const parsed = spendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { amount, merchant, category } = parsed.data;
  const agent = req.agent!;

  const [wallet, policies] = await Promise.all([
    prisma.wallet.findUnique({ where: { agentId: agent.id } }),
    prisma.policy.findMany({ where: { orgId: agent.orgId, isActive: true } }),
  ]);
  if (!wallet) {
    return res.status(409).json({ error: "Agent has no wallet" });
  }

  // Сброс дневного счётчика, если наступил новый день.
  const freshWallet = await maybeResetDaily(wallet);

  // Жёсткая проверка баланса до политик.
  if (amount > freshWallet.balance) {
    const tx = await prisma.transaction.create({
      data: {
        orgId: agent.orgId,
        agentId: agent.id,
        amount,
        merchant,
        category,
        status: "BLOCKED",
        reason: "Недостаточно средств на кошельке",
      },
    });
    return res.status(402).json(tx);
  }

  const decision = evaluate({ amount, category }, policies, freshWallet);

  // APPROVED -> списываем сразу. PENDING -> деньги ещё не двигаем.
  const tx = await prisma.$transaction(async (db) => {
    const created = await db.transaction.create({
      data: {
        orgId: agent.orgId,
        agentId: agent.id,
        amount,
        merchant,
        category,
        status: decision.status,
        reason: decision.reason,
      },
    });

    if (decision.status === "APPROVED") {
      await db.wallet.update({
        where: { id: freshWallet.id },
        data: {
          balance: { decrement: amount },
          dailySpent: { increment: amount },
        },
      });
    }
    return created;
  });

  if (decision.status === "PENDING") {
    notifyPending({
      kind: "transaction",
      agentName: agent.name,
      amount,
      to: merchant,
      reason: decision.reason,
    });
  }

  const httpStatus =
    decision.status === "APPROVED" ? 201 : decision.status === "PENDING" ? 202 : 200;
  res.status(httpStatus).json(tx);
});

/**
 * GET /v1/transactions — audit trail организации.
 * Можно фильтровать по статусу: ?status=PENDING
 */
transactionsRouter.get("/", requireOrg, async (req, res) => {
  const status = req.query.status as string | undefined;
  const transactions = await prisma.transaction.findMany({
    where: {
      orgId: req.orgId!,
      ...(status ? { status: status as any } : {}),
    },
    include: { agent: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(transactions);
});

// POST /v1/transactions/:id/approve — человек одобряет pending-трату.
transactionsRouter.post("/:id/approve", requireOrg, async (req, res) => {
  const decidedBy = (req.body?.decidedBy as string) ?? "admin";
  const tx = await prisma.transaction.findFirst({
    where: { id: req.params.id, orgId: req.orgId! },
  });
  if (!tx) return res.status(404).json({ error: "Transaction not found" });
  if (tx.status !== "PENDING") {
    return res.status(409).json({ error: `Transaction is ${tx.status}` });
  }

  const wallet = await prisma.wallet.findUnique({
    where: { agentId: tx.agentId },
  });
  if (!wallet || tx.amount > wallet.balance) {
    return res.status(402).json({ error: "Недостаточно средств" });
  }

  const updated = await prisma.$transaction(async (db) => {
    await db.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: tx.amount },
        dailySpent: { increment: tx.amount },
      },
    });
    return db.transaction.update({
      where: { id: tx.id },
      data: { status: "APPROVED", decidedAt: new Date(), decidedBy },
    });
  });
  res.json(updated);
});

// POST /v1/transactions/:id/reject — человек отклоняет pending-трату.
transactionsRouter.post("/:id/reject", requireOrg, async (req, res) => {
  const decidedBy = (req.body?.decidedBy as string) ?? "admin";
  const tx = await prisma.transaction.findFirst({
    where: { id: req.params.id, orgId: req.orgId! },
  });
  if (!tx) return res.status(404).json({ error: "Transaction not found" });
  if (tx.status !== "PENDING") {
    return res.status(409).json({ error: `Transaction is ${tx.status}` });
  }
  const updated = await prisma.transaction.update({
    where: { id: tx.id },
    data: { status: "REJECTED", decidedAt: new Date(), decidedBy },
  });
  res.json(updated);
});

/** Сбрасывает dailySpent, если со времени последнего сброса прошёл день. */
async function maybeResetDaily<T extends { id: string; dailyResetAt: Date; dailySpent: number }>(
  wallet: T
): Promise<T> {
  const now = new Date();
  const last = new Date(wallet.dailyResetAt);
  const isNewDay =
    now.getUTCFullYear() !== last.getUTCFullYear() ||
    now.getUTCMonth() !== last.getUTCMonth() ||
    now.getUTCDate() !== last.getUTCDate();

  if (!isNewDay) return wallet;

  const updated = await prisma.wallet.update({
    where: { id: wallet.id },
    data: { dailySpent: 0, dailyResetAt: now },
  });
  return { ...wallet, dailySpent: updated.dailySpent, dailyResetAt: updated.dailyResetAt };
}
