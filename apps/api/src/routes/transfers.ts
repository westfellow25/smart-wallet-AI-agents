import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { agentAuth } from "../middleware/agentAuth";
import { requireOrg } from "../middleware/orgContext";
import { createTransfer, moveFunds, TransferError } from "../lib/transferEngine";

export const transfersRouter = Router();

const transferSchema = z.object({
  toAgentId: z.string().min(1),
  amount: z.number().int().positive(), // в центах
  memo: z.string().optional(),
  category: z.string().optional(),
});

const withNames = {
  fromAgent: { select: { name: true } },
  toAgent: { select: { name: true } },
};

// POST /v1/transfers — агент A платит агенту B (agent-to-agent).
transfersRouter.post("/", agentAuth, async (req, res) => {
  const parsed = transferSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const transfer = await createTransfer({
      fromAgent: { id: req.agent!.id, orgId: req.agent!.orgId },
      ...parsed.data,
    });
    const http =
      transfer.status === "APPROVED" ? 201 : transfer.status === "PENDING" ? 202 : 200;
    res.status(http).json(transfer);
  } catch (e) {
    if (e instanceof TransferError) {
      return res.status(e.httpStatus).json({ error: e.message });
    }
    throw e;
  }
});

// GET /v1/transfers — лента A2A-переводов организации.
transfersRouter.get("/", requireOrg, async (req, res) => {
  const transfers = await prisma.transfer.findMany({
    where: { orgId: req.orgId! },
    include: withNames,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(transfers);
});

// POST /v1/transfers/:id/approve — человек одобряет pending-перевод.
transfersRouter.post("/:id/approve", requireOrg, async (req, res) => {
  const decidedBy = (req.body?.decidedBy as string) ?? "admin";
  const transfer = await prisma.transfer.findFirst({
    where: { id: req.params.id, orgId: req.orgId! },
  });
  if (!transfer) return res.status(404).json({ error: "Transfer not found" });
  if (transfer.status !== "PENDING") {
    return res.status(409).json({ error: `Transfer is ${transfer.status}` });
  }

  const [fromWallet, toWallet] = await Promise.all([
    prisma.wallet.findUnique({ where: { agentId: transfer.fromAgentId } }),
    prisma.wallet.findUnique({ where: { agentId: transfer.toAgentId } }),
  ]);
  if (!fromWallet || !toWallet) {
    return res.status(409).json({ error: "Wallet missing" });
  }
  if (transfer.amount > fromWallet.balance) {
    return res.status(402).json({ error: "Недостаточно средств у отправителя" });
  }

  const updated = await prisma.$transaction(async (db) => {
    await moveFunds(db, fromWallet.id, toWallet.id, transfer.amount);
    return db.transfer.update({
      where: { id: transfer.id },
      data: { status: "APPROVED", decidedAt: new Date(), decidedBy },
      include: withNames,
    });
  });
  res.json(updated);
});

// POST /v1/transfers/:id/reject — человек отклоняет pending-перевод.
transfersRouter.post("/:id/reject", requireOrg, async (req, res) => {
  const decidedBy = (req.body?.decidedBy as string) ?? "admin";
  const transfer = await prisma.transfer.findFirst({
    where: { id: req.params.id, orgId: req.orgId! },
  });
  if (!transfer) return res.status(404).json({ error: "Transfer not found" });
  if (transfer.status !== "PENDING") {
    return res.status(409).json({ error: `Transfer is ${transfer.status}` });
  }
  const updated = await prisma.transfer.update({
    where: { id: transfer.id },
    data: { status: "REJECTED", decidedAt: new Date(), decidedBy },
    include: withNames,
  });
  res.json(updated);
});
