import { Router } from "express";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireOrg } from "../middleware/orgContext";

export const cardsRouter = Router();

const issueSchema = z.object({
  agentId: z.string().min(1),
  network: z.enum(["VISA", "USDC_BASE"]).default("USDC_BASE"),
});

// GET /v1/cards — все виртуальные карты организации.
cardsRouter.get("/", requireOrg, async (req, res) => {
  const cards = await prisma.virtualCard.findMany({
    where: { orgId: req.orgId! },
    include: { agent: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(cards);
});

// POST /v1/cards — выпустить карту для агента.
// В dev генерируем номер локально; в проде здесь был бы вызов
// эмитента (Stripe Issuing / Lithic) или минт on-chain карты на Base.
cardsRouter.post("/", requireOrg, async (req, res) => {
  const parsed = issueSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { agentId, network } = parsed.data;

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, orgId: req.orgId! },
    include: { card: true },
  });
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  if (agent.card) {
    return res.status(409).json({ error: "Agent already has a card" });
  }

  const now = new Date();
  const card = await prisma.virtualCard.create({
    data: {
      orgId: req.orgId!,
      agentId,
      network,
      last4: String(randomInt(1000, 10000)),
      expMonth: now.getUTCMonth() + 1,
      expYear: now.getUTCFullYear() + 3,
    },
    include: { agent: { select: { name: true } } },
  });
  res.status(201).json(card);
});

// POST /v1/cards/:id/freeze — заморозить карту.
cardsRouter.post("/:id/freeze", requireOrg, (req, res) => setStatus(req, res, "FROZEN"));
// POST /v1/cards/:id/unfreeze — разморозить карту.
cardsRouter.post("/:id/unfreeze", requireOrg, (req, res) => setStatus(req, res, "ACTIVE"));

async function setStatus(req: any, res: any, status: "ACTIVE" | "FROZEN") {
  const card = await prisma.virtualCard.findFirst({
    where: { id: req.params.id, orgId: req.orgId! },
  });
  if (!card) return res.status(404).json({ error: "Card not found" });
  const updated = await prisma.virtualCard.update({
    where: { id: card.id },
    data: { status },
    include: { agent: { select: { name: true } } },
  });
  res.json(updated);
}
