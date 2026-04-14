import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

export const policiesRouter = Router();
policiesRouter.use(authenticate);

// ─── List policies ───────────────────────────────────────────

policiesRouter.get("/", async (req: Request, res: Response) => {
  const policies = await prisma.policy.findMany({
    where: { organizationId: req.user!.organizationId },
    include: {
      _count: { select: { agents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ policies });
});

// ─── Get single policy ──────────────────────────────────────

policiesRouter.get("/:id", async (req: Request, res: Response) => {
  const policy = await prisma.policy.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId,
    },
    include: {
      agents: { include: { agent: { select: { id: true, name: true } } } },
    },
  });

  if (!policy) throw new AppError(404, "Policy not found");
  res.json({ policy });
});

// ─── Create policy ───────────────────────────────────────────

const createPolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  action: z.enum(["ALLOW", "BLOCK", "REQUIRE_APPROVAL", "FLAG"]).default("BLOCK"),
  rules: z.object({
    maxAmount: z.number().positive().optional(),
    allowedCategories: z.array(z.string()).optional(),
    blockedCategories: z.array(z.string()).optional(),
    maxDailySpend: z.number().positive().optional(),
    maxMonthlySpend: z.number().positive().optional(),
    timeWindow: z
      .object({
        startHour: z.number().min(0).max(23),
        endHour: z.number().min(0).max(23),
        timezone: z.string().default("UTC"),
      })
      .optional(),
  }),
});

policiesRouter.post("/", async (req: Request, res: Response) => {
  const body = createPolicySchema.parse(req.body);

  const policy = await prisma.policy.create({
    data: {
      name: body.name,
      description: body.description,
      action: body.action,
      rules: body.rules,
      organizationId: req.user!.organizationId,
    },
  });

  res.status(201).json({ policy });
});

// ─── Update policy ───────────────────────────────────────────

policiesRouter.patch("/:id", async (req: Request, res: Response) => {
  const body = createPolicySchema.partial().parse(req.body);

  const result = await prisma.policy.updateMany({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId,
    },
    data: {
      name: body.name,
      description: body.description,
      action: body.action,
      rules: body.rules,
    },
  });

  if (result.count === 0) throw new AppError(404, "Policy not found");

  const policy = await prisma.policy.findUnique({ where: { id: req.params.id } });
  res.json({ policy });
});

// ─── Delete policy ───────────────────────────────────────────

policiesRouter.delete("/:id", async (req: Request, res: Response) => {
  // Remove all agent associations first
  await prisma.agentPolicy.deleteMany({ where: { policyId: req.params.id } });

  const result = await prisma.policy.deleteMany({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId,
    },
  });

  if (result.count === 0) throw new AppError(404, "Policy not found");
  res.json({ message: "Policy deleted" });
});
