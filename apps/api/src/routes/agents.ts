import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireOrg } from "../middleware/orgContext";

export const agentsRouter = Router();

const createAgentSchema = z.object({
  name: z.string().min(1),
  startingBalance: z.number().int().nonnegative().default(0), // в центах
  currency: z.string().default("USD"),
});

// POST /v1/agents — создать агента, выдать API-ключ и кошелёк.
agentsRouter.post("/", requireOrg, async (req, res) => {
  const parsed = createAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, startingBalance, currency } = parsed.data;
  const apiKey = "av_" + randomBytes(24).toString("hex");

  const agent = await prisma.agent.create({
    data: {
      orgId: req.orgId!,
      name,
      apiKey,
      wallet: {
        create: {
          orgId: req.orgId!,
          balance: startingBalance,
          currency,
        },
      },
    },
    include: { wallet: true },
  });

  // apiKey показываем ТОЛЬКО один раз, при создании.
  res.status(201).json(agent);
});

// GET /v1/agents — список агентов организации (без секретов).
agentsRouter.get("/", requireOrg, async (req, res) => {
  const agents = await prisma.agent.findMany({
    where: { orgId: req.orgId! },
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      wallet: { select: { balance: true, dailySpent: true, currency: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(agents);
});
