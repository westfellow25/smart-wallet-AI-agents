import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { agentAuth } from "../middleware/agentAuth";
import { requireOrg } from "../middleware/orgContext";
import { createTransfer, TransferError } from "../lib/transferEngine";

export const paymentRequestsRouter = Router();

const createSchema = z.object({
  amount: z.number().int().positive(),
  memo: z.string().optional(),
  payerAgentId: z.string().optional(),
  category: z.string().optional(),
});

const withNames = {
  payee: { select: { name: true } },
  payer: { select: { name: true } },
  transfer: true,
};

// POST /v1/payment-requests — агент-получатель выставляет счёт.
paymentRequestsRouter.post("/", agentAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const pr = await prisma.paymentRequest.create({
    data: {
      orgId: req.agent!.orgId,
      payeeAgentId: req.agent!.id,
      payerAgentId: parsed.data.payerAgentId,
      amount: parsed.data.amount,
      memo: parsed.data.memo,
      category: parsed.data.category ?? "a2a",
    },
    include: withNames,
  });
  res.status(201).json(pr);
});

// POST /v1/payment-requests/:id/pay — агент-плательщик оплачивает счёт.
// Создаёт Transfer payer -> payee через Policy Engine плательщика.
paymentRequestsRouter.post("/:id/pay", agentAuth, async (req, res) => {
  const pr = await prisma.paymentRequest.findUnique({ where: { id: req.params.id } });
  if (!pr) return res.status(404).json({ error: "Payment request not found" });
  if (pr.status !== "OPEN") {
    return res.status(409).json({ error: `Payment request is ${pr.status}` });
  }
  if (pr.payeeAgentId === req.agent!.id) {
    return res.status(400).json({ error: "Cannot pay your own request" });
  }
  if (pr.payerAgentId && pr.payerAgentId !== req.agent!.id) {
    return res.status(403).json({ error: "This request is addressed to another agent" });
  }

  try {
    const transfer = await createTransfer({
      fromAgent: { id: req.agent!.id, orgId: req.agent!.orgId },
      toAgentId: pr.payeeAgentId,
      amount: pr.amount,
      memo: pr.memo ?? `Payment for request ${pr.id}`,
      category: pr.category,
    });

    // Счёт закрывается только если перевод прошёл сразу (APPROVED).
    const updated = await prisma.paymentRequest.update({
      where: { id: pr.id },
      data:
        transfer.status === "APPROVED"
          ? { status: "PAID", transferId: transfer.id, payerAgentId: req.agent!.id }
          : { payerAgentId: req.agent!.id },
      include: withNames,
    });
    const http = transfer.status === "APPROVED" ? 200 : transfer.status === "PENDING" ? 202 : 200;
    res.status(http).json({ paymentRequest: updated, transfer });
  } catch (e) {
    if (e instanceof TransferError) {
      return res.status(e.httpStatus).json({ error: e.message });
    }
    throw e;
  }
});

// GET /v1/payment-requests — счета организации.
paymentRequestsRouter.get("/", requireOrg, async (req, res) => {
  const prs = await prisma.paymentRequest.findMany({
    where: { orgId: req.orgId! },
    include: withNames,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(prs);
});

// POST /v1/payment-requests/:id/cancel — отменить открытый счёт.
paymentRequestsRouter.post("/:id/cancel", requireOrg, async (req, res) => {
  const pr = await prisma.paymentRequest.findFirst({
    where: { id: req.params.id, orgId: req.orgId! },
  });
  if (!pr) return res.status(404).json({ error: "Payment request not found" });
  if (pr.status !== "OPEN") {
    return res.status(409).json({ error: `Payment request is ${pr.status}` });
  }
  const updated = await prisma.paymentRequest.update({
    where: { id: pr.id },
    data: { status: "CANCELED" },
    include: withNames,
  });
  res.json(updated);
});
