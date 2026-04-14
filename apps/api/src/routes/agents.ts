import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

export const agentsRouter = Router();
agentsRouter.use(authenticate);

// ─── List agents ─────────────────────────────────────────────

agentsRouter.get("/", async (req: Request, res: Response) => {
  const agents = await prisma.agent.findMany({
    where: { organizationId: req.user!.organizationId },
    include: {
      wallet: { select: { id: true, name: true, balance: true } },
      _count: { select: { transactions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ agents });
});

// ─── Get single agent ────────────────────────────────────────

agentsRouter.get("/:id", async (req: Request, res: Response) => {
  const agent = await prisma.agent.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId,
    },
    include: {
      wallet: true,
      policies: { include: { policy: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!agent) throw new AppError(404, "Agent not found");
  res.json({ agent });
});

// ─── Create agent ────────────────────────────────────────────

const createAgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().min(1),
  walletId: z.string().uuid(),
  metadata: z.record(z.unknown()).optional(),
});

agentsRouter.post("/", async (req: Request, res: Response) => {
  const body = createAgentSchema.parse(req.body);

  // Verify wallet belongs to org
  const wallet = await prisma.wallet.findFirst({
    where: {
      id: body.walletId,
      organizationId: req.user!.organizationId,
    },
  });

  if (!wallet) throw new AppError(404, "Wallet not found");

  const agent = await prisma.agent.create({
    data: {
      name: body.name,
      description: body.description,
      type: body.type,
      metadata: body.metadata,
      walletId: body.walletId,
      organizationId: req.user!.organizationId,
    },
    include: { wallet: { select: { id: true, name: true, balance: true } } },
  });

  res.status(201).json({ agent });
});

// ─── Update agent ────────────────────────────────────────────

const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "REVOKED"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

agentsRouter.patch("/:id", async (req: Request, res: Response) => {
  const body = updateAgentSchema.parse(req.body);

  const result = await prisma.agent.updateMany({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId,
    },
    data: body,
  });

  if (result.count === 0) throw new AppError(404, "Agent not found");

  const agent = await prisma.agent.findUnique({
    where: { id: req.params.id },
    include: { wallet: { select: { id: true, name: true, balance: true } } },
  });

  res.json({ agent });
});

// ─── Attach policy to agent ──────────────────────────────────

agentsRouter.post("/:id/policies", async (req: Request, res: Response) => {
  const { policyId } = z.object({ policyId: z.string().uuid() }).parse(req.body);

  // Verify agent and policy belong to org
  const [agent, policy] = await Promise.all([
    prisma.agent.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    }),
    prisma.policy.findFirst({
      where: { id: policyId, organizationId: req.user!.organizationId },
    }),
  ]);

  if (!agent) throw new AppError(404, "Agent not found");
  if (!policy) throw new AppError(404, "Policy not found");

  await prisma.agentPolicy.create({
    data: { agentId: agent.id, policyId: policy.id },
  });

  res.status(201).json({ message: "Policy attached" });
});
