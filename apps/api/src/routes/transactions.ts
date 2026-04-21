import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticateApiKeyOrJwt, requireScope } from "../middleware/apiKeyAuth";
import { AppError } from "../middleware/errorHandler";
import { evaluatePolicies } from "../services/policyEngine";
import { dispatchWebhook } from "../services/webhooks";
import { logAudit } from "../services/audit";

export const transactionsRouter = Router();
transactionsRouter.use(authenticateApiKeyOrJwt);

// ─── List transactions ───────────────────────────────────────

transactionsRouter.get("/", async (req: Request, res: Response) => {
  const { agentId, walletId, status, limit = "50", offset = "0" } = req.query;

  const where: Record<string, unknown> = {
    organizationId: req.user!.organizationId,
  };
  if (agentId) where.agentId = agentId;
  if (walletId) where.walletId = walletId;
  if (status) where.status = status;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true, type: true } },
        wallet: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(limit), 100),
      skip: Number(offset),
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ transactions, total });
});

// ─── Get single transaction ──────────────────────────────────

transactionsRouter.get("/:id", async (req: Request, res: Response) => {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId,
    },
    include: {
      agent: true,
      wallet: true,
      approval: true,
    },
  });

  if (!transaction) throw new AppError(404, "Transaction not found");
  res.json({ transaction });
});

// ─── Create transaction (spend request from agent) ───────────

const createTxSchema = z.object({
  amount: z.number().positive(),
  agentId: z.string().uuid().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  merchantName: z.string().optional(),
  reference: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

transactionsRouter.post(
  "/",
  requireScope("transactions:write"),
  async (req: Request, res: Response) => {
  const body = createTxSchema.parse(req.body);
  const orgId = req.user!.organizationId;

  // Auto-fill agentId from API key if not provided
  const agentId = body.agentId || req.apiKeyAgentId;
  if (!agentId) {
    throw new AppError(400, "agentId required (or use an agent-scoped API key)");
  }

  // Load agent + wallet
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, organizationId: orgId },
    include: {
      wallet: true,
      policies: { include: { policy: true } },
    },
  });

  if (!agent) throw new AppError(404, "Agent not found");
  if (agent.status !== "ACTIVE") throw new AppError(403, "Agent is not active");
  if (agent.wallet.status !== "ACTIVE") throw new AppError(403, "Wallet is frozen");

  // Check balance
  if (Number(agent.wallet.balance) < body.amount) {
    throw new AppError(400, "Insufficient balance");
  }

  // Evaluate spending policies
  const policyResult = evaluatePolicies(agent, body.amount, body.category);

  if (policyResult.action === "BLOCK") {
    const tx = await prisma.transaction.create({
      data: {
        amount: body.amount,
        type: "SPEND",
        status: "BLOCKED",
        category: body.category,
        description: body.description,
        merchantName: body.merchantName,
        reference: body.reference,
        metadata: { ...body.metadata, blockReason: policyResult.reason },
        agentId: agent.id,
        walletId: agent.walletId,
        organizationId: orgId,
      },
    });
    dispatchWebhook({
      event: "transaction.blocked",
      organizationId: orgId,
      data: { transaction: tx, reason: policyResult.reason },
    }).catch(() => {});
    logAudit({
      action: "transaction.blocked",
      resourceType: "Transaction",
      resourceId: tx.id,
      organizationId: orgId,
      actorType: "system",
      metadata: { reason: policyResult.reason, amount: body.amount },
    }).catch(() => {});
    return res.status(403).json({ transaction: tx, blocked: true, reason: policyResult.reason });
  }

  if (policyResult.action === "REQUIRE_APPROVAL") {
    const tx = await prisma.transaction.create({
      data: {
        amount: body.amount,
        type: "SPEND",
        status: "PENDING",
        category: body.category,
        description: body.description,
        merchantName: body.merchantName,
        reference: body.reference,
        metadata: body.metadata,
        agentId: agent.id,
        walletId: agent.walletId,
        organizationId: orgId,
        approval: {
          create: { status: "PENDING" },
        },
      },
      include: { approval: true },
    });
    dispatchWebhook({
      event: "approval.required",
      organizationId: orgId,
      data: { transaction: tx },
    }).catch(() => {});
    return res.status(202).json({ transaction: tx, requiresApproval: true });
  }

  // Auto-approved: deduct balance and complete
  const [tx] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        amount: body.amount,
        type: "SPEND",
        status: "COMPLETED",
        category: body.category,
        description: body.description,
        merchantName: body.merchantName,
        reference: body.reference,
        metadata: body.metadata,
        agentId: agent.id,
        walletId: agent.walletId,
        organizationId: orgId,
      },
    }),
    prisma.wallet.update({
      where: { id: agent.walletId },
      data: { balance: { decrement: body.amount } },
    }),
  ]);

  res.status(201).json({ transaction: tx });
});

// ─── Approve / Reject pending transaction ────────────────────

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().optional(),
});

transactionsRouter.post("/:id/review", async (req: Request, res: Response) => {
  if (req.user!.role === "api") {
    throw new AppError(403, "Approvals require a user account (not an API key)");
  }
  const { action, note } = reviewSchema.parse(req.body);
  const orgId = req.user!.organizationId;

  const transaction = await prisma.transaction.findFirst({
    where: { id: req.params.id, organizationId: orgId, status: "PENDING" },
    include: { approval: true },
  });

  if (!transaction) throw new AppError(404, "Pending transaction not found");

  if (action === "approve") {
    await prisma.$transaction([
      prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "COMPLETED" },
      }),
      prisma.approval.update({
        where: { id: transaction.approval!.id },
        data: { status: "APPROVED", reviewerId: req.user!.userId, note },
      }),
      prisma.wallet.update({
        where: { id: transaction.walletId },
        data: { balance: { decrement: transaction.amount } },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "BLOCKED" },
      }),
      prisma.approval.update({
        where: { id: transaction.approval!.id },
        data: { status: "REJECTED", reviewerId: req.user!.userId, note },
      }),
    ]);
  }

  const updated = await prisma.transaction.findUnique({
    where: { id: transaction.id },
    include: { approval: true },
  });

  res.json({ transaction: updated });
});
