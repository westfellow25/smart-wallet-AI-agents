import type { Transfer } from "@prisma/client";
import { prisma } from "./prisma";
import { evaluate } from "./policyEngine";

export class TransferError extends Error {
  constructor(message: string, public httpStatus: number) {
    super(message);
    this.name = "TransferError";
  }
}

export type TransferInput = {
  fromAgent: { id: string; orgId: string };
  toAgentId: string;
  amount: number; // в центах
  memo?: string;
  category?: string;
};

/**
 * Создаёт agent-to-agent перевод, прогоняя его через Policy Engine
 * отправителя. На APPROVED — сразу двигает средства между кошельками.
 * На PENDING/BLOCKED — фиксирует решение без движения денег.
 *
 * Бросает TransferError для жёстких ошибок (нет получателя, сам себе,
 * нет средств), которые не являются нормальным исходом политики.
 */
export async function createTransfer(input: TransferInput): Promise<Transfer> {
  const { fromAgent, toAgentId, amount, memo } = input;
  const category = input.category ?? "a2a";

  if (toAgentId === fromAgent.id) {
    throw new TransferError("Cannot transfer to self", 400);
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new TransferError("amount must be a positive integer (cents)", 400);
  }

  const [fromWallet, toAgent] = await Promise.all([
    prisma.wallet.findUnique({ where: { agentId: fromAgent.id } }),
    prisma.agent.findUnique({ where: { id: toAgentId }, include: { wallet: true } }),
  ]);

  if (!fromWallet) throw new TransferError("Sender has no wallet", 409);
  if (!toAgent || !toAgent.wallet) throw new TransferError("Recipient agent not found", 404);
  if (toAgent.status !== "ACTIVE") throw new TransferError("Recipient agent is not active", 409);

  const policies = await prisma.policy.findMany({
    where: { orgId: fromAgent.orgId, isActive: true },
  });

  // Недостаточно средств — это не нарушение политики, а жёсткий BLOCKED.
  if (amount > fromWallet.balance) {
    return prisma.transfer.create({
      data: {
        orgId: fromAgent.orgId,
        fromAgentId: fromAgent.id,
        toAgentId,
        amount,
        memo,
        category,
        status: "BLOCKED",
        reason: "Недостаточно средств на кошельке отправителя",
      },
    });
  }

  const decision = evaluate({ amount, category }, policies, fromWallet);

  return prisma.$transaction(async (db) => {
    const transfer = await db.transfer.create({
      data: {
        orgId: fromAgent.orgId,
        fromAgentId: fromAgent.id,
        toAgentId,
        amount,
        memo,
        category,
        status: decision.status,
        reason: decision.reason,
      },
    });

    if (decision.status === "APPROVED") {
      await moveFunds(db, fromWallet.id, toAgent.wallet!.id, amount);
    }
    return transfer;
  });
}

/** Списывает у отправителя (баланс + дневной счётчик) и зачисляет получателю. */
export async function moveFunds(
  db: Pick<typeof prisma, "wallet">,
  fromWalletId: string,
  toWalletId: string,
  amount: number
) {
  await db.wallet.update({
    where: { id: fromWalletId },
    data: { balance: { decrement: amount }, dailySpent: { increment: amount } },
  });
  await db.wallet.update({
    where: { id: toWalletId },
    data: { balance: { increment: amount } },
  });
}
