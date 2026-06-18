import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { agentAuth } from "../middleware/agentAuth";
import { createTransfer, TransferError } from "../lib/transferEngine";
import { signReceipt, verifyReceipt } from "../lib/x402";

export const x402Router = Router();

const paySchema = z.object({
  toAgentId: z.string().min(1),
  amount: z.number().int().positive(),
  resource: z.string().min(1),
  memo: z.string().optional(),
});

/**
 * POST /v1/x402/pay — агент платит за ресурс «на лету».
 * Проходит через Policy Engine (как обычный A2A-перевод).
 *  - APPROVED -> 200 + подписанная квитанция (header X-Payment для ресурса)
 *  - PENDING  -> 402 payment_pending (ждёт одобрения человека)
 *  - BLOCKED  -> 402 payment_blocked (нарушает политику)
 */
x402Router.post("/pay", agentAuth, async (req, res) => {
  const parsed = paySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { toAgentId, amount, resource, memo } = parsed.data;
  try {
    const transfer = await createTransfer({
      fromAgent: { id: req.agent!.id, orgId: req.agent!.orgId },
      toAgentId,
      amount,
      memo: memo ?? `x402 ${resource}`,
      category: "a2a",
    });

    if (transfer.status === "APPROVED") {
      const receipt = signReceipt({
        transferId: transfer.id,
        resource,
        amount,
        payer: req.agent!.id,
        payee: toAgentId,
      });
      return res.json({ paid: true, receipt, transfer });
    }

    return res.status(402).json({
      paid: false,
      status: transfer.status === "PENDING" ? "payment_pending" : "payment_blocked",
      reason: transfer.reason,
      transfer,
    });
  } catch (e) {
    if (e instanceof TransferError) {
      return res.status(e.httpStatus).json({ error: e.message });
    }
    throw e;
  }
});

// POST /v1/x402/verify — сервер ресурса проверяет квитанцию.
x402Router.post("/verify", (req, res) => {
  const receipt = req.body?.receipt as string | undefined;
  const payload = receipt ? verifyReceipt(receipt) : null;
  res.json({ valid: Boolean(payload), payload });
});

/**
 * GET /v1/x402/protected — демонстрационный платный ресурс.
 * Без оплаты отвечает 402 с требованиями; с валидной квитанцией в
 * заголовке `X-Payment` отдаёт контент. Это полный цикл x402.
 */
const PRICE = 500; // $5.00
const RESOURCE = "/v1/x402/protected";

x402Router.get("/protected", agentAuth, async (req, res) => {
  const receiptToken = req.header("x-payment");
  const receipt = receiptToken ? verifyReceipt(receiptToken) : null;

  if (receipt && receipt.resource === RESOURCE && receipt.amount >= PRICE) {
    return res.json({
      unlocked: true,
      data: "🔓 Premium dataset: { audience: 12,438 leads, ctr: 3.1% }",
      paidWith: receipt.transferId,
    });
  }

  // Кому платить — назначаем «провайдером ресурса» другого агента организации.
  const provider = await prisma.agent.findFirst({
    where: { orgId: req.agent!.orgId, status: "ACTIVE", id: { not: req.agent!.id } },
    select: { id: true, name: true },
  });

  res.status(402).json({
    x402Version: 1,
    error: "Payment Required",
    accepts: [
      {
        scheme: "agentvault",
        resource: RESOURCE,
        maxAmountRequired: PRICE,
        currency: "USD",
        payTo: provider?.id ?? null,
        payToName: provider?.name ?? null,
        description: "Premium dataset access",
      },
    ],
    hint: `POST /v1/x402/pay { toAgentId, amount: ${PRICE}, resource: "${RESOURCE}" }, then retry with header X-Payment: <receipt>`,
  });
});
