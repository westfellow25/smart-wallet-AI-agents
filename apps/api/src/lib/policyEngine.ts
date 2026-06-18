import type { Policy, Wallet } from "@prisma/client";

export type SpendRequest = {
  amount: number; // в центах
  category: string;
};

export type PolicyDecision = {
  status: "APPROVED" | "PENDING" | "BLOCKED";
  reason: string | null;
};

/**
 * Сердце AgentVault: решает судьбу каждой траты агента.
 *
 * Порядок проверок (от жёстких к мягким):
 *   1. BLOCKED — категория не разрешена
 *   2. BLOCKED — превышен лимит на одну транзакцию
 *   3. BLOCKED — превышен дневной лимит
 *   4. PENDING — сумма выше порога, нужно человеческое одобрение
 *   5. APPROVED — всё ок
 *
 * Политики комбинируются консервативно: самое строгое значение из всех
 * активных политик организации становится действующим лимитом.
 */
export function evaluate(
  req: SpendRequest,
  policies: Policy[],
  wallet: Pick<Wallet, "dailySpent">
): PolicyDecision {
  const activePolicies = policies.filter((p) => p.isActive);

  // 1. Категория должна быть разрешена ХОТЯ БЫ одной политикой,
  //    если у этой политики список категорий непустой.
  for (const p of activePolicies) {
    if (
      p.allowedCategories.length > 0 &&
      !p.allowedCategories.includes(req.category)
    ) {
      return {
        status: "BLOCKED",
        reason: `Категория "${req.category}" не разрешена политикой "${p.name}"`,
      };
    }
  }

  // 2. Лимит на одну транзакцию — берём минимальный заданный.
  const maxPerTx = minDefined(activePolicies.map((p) => p.maxPerTransaction));
  if (maxPerTx !== null && req.amount > maxPerTx) {
    return {
      status: "BLOCKED",
      reason: `Сумма ${fmt(req.amount)} превышает лимит на транзакцию ${fmt(maxPerTx)}`,
    };
  }

  // 3. Дневной лимит — минимальный заданный, сравниваем с уже потраченным.
  const dailyLimit = minDefined(activePolicies.map((p) => p.dailyLimit));
  if (dailyLimit !== null && wallet.dailySpent + req.amount > dailyLimit) {
    const remaining = Math.max(0, dailyLimit - wallet.dailySpent);
    return {
      status: "BLOCKED",
      reason: `Дневной лимit ${fmt(dailyLimit)} будет превышен (осталось ${fmt(remaining)})`,
    };
  }

  // 4. Порог одобрения — минимальный заданный.
  const approvalOver = minDefined(
    activePolicies.map((p) => p.requireApprovalOver)
  );
  if (approvalOver !== null && req.amount > approvalOver) {
    return {
      status: "PENDING",
      reason: `Сумма ${fmt(req.amount)} выше порога ${fmt(approvalOver)} — требуется одобрение человека`,
    };
  }

  // 5. Всё чисто.
  return { status: "APPROVED", reason: null };
}

/** Минимальное из заданных (не-null) значений, либо null если все null. */
function minDefined(values: (number | null)[]): number | null {
  const defined = values.filter((v): v is number => v !== null);
  return defined.length ? Math.min(...defined) : null;
}

/** Форматирование центов в доллары для человекочитаемых причин. */
function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
