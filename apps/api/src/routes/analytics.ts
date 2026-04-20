import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

export const analyticsRouter = Router();
analyticsRouter.use(authenticate);

analyticsRouter.get("/overview", async (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalSpentThisMonth,
    totalSpentPrevMonth,
    activeAgents,
    totalTransactions,
    blockedCount,
    pendingCount,
    totalBudget,
    walletBalance,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        organizationId: orgId,
        type: "SPEND",
        status: "COMPLETED",
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        organizationId: orgId,
        type: "SPEND",
        status: "COMPLETED",
        createdAt: { gte: prevMonthStart, lt: startOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.agent.count({
      where: { organizationId: orgId, status: "ACTIVE" },
    }),
    prisma.transaction.count({
      where: { organizationId: orgId, createdAt: { gte: startOfMonth } },
    }),
    prisma.transaction.count({
      where: {
        organizationId: orgId,
        status: "BLOCKED",
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.transaction.count({
      where: { organizationId: orgId, status: "PENDING" },
    }),
    prisma.wallet.aggregate({
      where: { organizationId: orgId },
      _sum: { monthlyBudget: true },
    }),
    prisma.wallet.aggregate({
      where: { organizationId: orgId },
      _sum: { balance: true },
    }),
  ]);

  const spent = Number(totalSpentThisMonth._sum.amount || 0);
  const prevSpent = Number(totalSpentPrevMonth._sum.amount || 0);
  const budget = Number(totalBudget._sum.monthlyBudget || 0);

  const spendChange =
    prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : 0;

  res.json({
    totalSpent: spent,
    spendChange: Math.round(spendChange * 10) / 10,
    activeAgents,
    totalTransactions,
    blockedCount,
    pendingCount,
    budgetUsedPct: budget > 0 ? Math.round((spent / budget) * 100) : 0,
    walletBalance: Number(walletBalance._sum.balance || 0),
  });
});

analyticsRouter.get("/daily", async (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const days = Math.min(Number(req.query.days) || 7, 90);
  const since = new Date(Date.now() - days * 86400_000);

  const rows = await prisma.$queryRaw<Array<{ day: Date; total: number; count: bigint }>>`
    SELECT
      DATE_TRUNC('day', "createdAt") AS day,
      COALESCE(SUM(amount), 0)::float AS total,
      COUNT(*) AS count
    FROM "transactions"
    WHERE "organizationId" = ${orgId}
      AND "status" = 'COMPLETED'
      AND "type" = 'SPEND'
      AND "createdAt" >= ${since}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY day ASC
  `;

  res.json({
    daily: rows.map((r) => ({
      day: r.day.toISOString().split("T")[0],
      total: Number(r.total),
      count: Number(r.count),
    })),
  });
});

analyticsRouter.get("/by-category", async (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const since = new Date(Date.now() - 30 * 86400_000);

  const rows = await prisma.transaction.groupBy({
    by: ["category"],
    where: {
      organizationId: orgId,
      status: "COMPLETED",
      type: "SPEND",
      createdAt: { gte: since },
    },
    _sum: { amount: true },
    _count: true,
  });

  res.json({
    categories: rows.map((r) => ({
      category: r.category || "uncategorized",
      total: Number(r._sum.amount || 0),
      count: r._count,
    })),
  });
});

analyticsRouter.get("/by-agent", async (req: Request, res: Response) => {
  const orgId = req.user!.organizationId;
  const since = new Date(Date.now() - 30 * 86400_000);

  const rows = await prisma.transaction.groupBy({
    by: ["agentId"],
    where: {
      organizationId: orgId,
      status: "COMPLETED",
      type: "SPEND",
      createdAt: { gte: since },
    },
    _sum: { amount: true },
    _count: true,
  });

  const agents = await prisma.agent.findMany({
    where: { id: { in: rows.map((r) => r.agentId) } },
    select: { id: true, name: true, type: true },
  });
  const agentMap = new Map(agents.map((a) => [a.id, a]));

  res.json({
    byAgent: rows.map((r) => ({
      agentId: r.agentId,
      agentName: agentMap.get(r.agentId)?.name || "Unknown",
      agentType: agentMap.get(r.agentId)?.type || "unknown",
      total: Number(r._sum.amount || 0),
      count: r._count,
    })),
  });
});
