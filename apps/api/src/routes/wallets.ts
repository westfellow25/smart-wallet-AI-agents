import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticateApiKeyOrJwt } from "../middleware/apiKeyAuth";
import { AppError } from "../middleware/errorHandler";

export const walletsRouter = Router();
walletsRouter.use(authenticateApiKeyOrJwt);

// ─── Me (wallet scoped to current API key's agent) ───────────

walletsRouter.get("/me", async (req: Request, res: Response) => {
  if (!req.apiKeyAgentId) {
    throw new AppError(400, "This endpoint requires an agent-scoped API key");
  }
  const agent = await prisma.agent.findFirst({
    where: { id: req.apiKeyAgentId, organizationId: req.user!.organizationId },
    include: { wallet: true },
  });
  if (!agent) throw new AppError(404, "Agent wallet not found");
  res.json({ wallet: agent.wallet });
});

// ─── List wallets ────────────────────────────────────────────

walletsRouter.get("/", async (req: Request, res: Response) => {
  const wallets = await prisma.wallet.findMany({
    where: { organizationId: req.user!.organizationId },
    include: {
      _count: { select: { agents: true, transactions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ wallets });
});

// ─── Get single wallet ──────────────────────────────────────

walletsRouter.get("/:id", async (req: Request, res: Response) => {
  const wallet = await prisma.wallet.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId,
    },
    include: {
      agents: true,
      _count: { select: { transactions: true } },
    },
  });

  if (!wallet) throw new AppError(404, "Wallet not found");
  res.json({ wallet });
});

// ─── Create wallet ───────────────────────────────────────────

const createWalletSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["MASTER", "AGENT", "DEPARTMENT"]).default("AGENT"),
  currency: z.string().default("USD"),
  monthlyBudget: z.number().positive().optional(),
  dailyLimit: z.number().positive().optional(),
  perTxLimit: z.number().positive().optional(),
});

walletsRouter.post("/", async (req: Request, res: Response) => {
  const body = createWalletSchema.parse(req.body);

  const wallet = await prisma.wallet.create({
    data: {
      ...body,
      organizationId: req.user!.organizationId,
    },
  });

  res.status(201).json({ wallet });
});

// ─── Update wallet ───────────────────────────────────────────

const updateWalletSchema = z.object({
  name: z.string().min(1).optional(),
  monthlyBudget: z.number().positive().nullable().optional(),
  dailyLimit: z.number().positive().nullable().optional(),
  perTxLimit: z.number().positive().nullable().optional(),
  status: z.enum(["ACTIVE", "FROZEN", "CLOSED"]).optional(),
});

walletsRouter.patch("/:id", async (req: Request, res: Response) => {
  const body = updateWalletSchema.parse(req.body);

  const wallet = await prisma.wallet.updateMany({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId,
    },
    data: body,
  });

  if (wallet.count === 0) throw new AppError(404, "Wallet not found");

  const updated = await prisma.wallet.findUnique({
    where: { id: req.params.id },
  });

  res.json({ wallet: updated });
});

// ─── Deposit funds ───────────────────────────────────────────

const depositSchema = z.object({
  amount: z.number().positive(),
});

walletsRouter.post("/:id/deposit", async (req: Request, res: Response) => {
  const { amount } = depositSchema.parse(req.body);

  const wallet = await prisma.wallet.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId,
    },
  });

  if (!wallet) throw new AppError(404, "Wallet not found");

  const [updatedWallet, transaction] = await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    }),
    prisma.transaction.create({
      data: {
        amount,
        type: "DEPOSIT",
        status: "COMPLETED",
        description: "Manual deposit",
        walletId: wallet.id,
        organizationId: req.user!.organizationId,
      },
    }),
  ]);

  res.json({ wallet: updatedWallet, transaction });
});
