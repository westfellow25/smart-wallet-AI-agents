/**
 * Policy Engine — evaluates spending rules for agent transactions.
 *
 * Rules schema (stored in Policy.rules JSON):
 * {
 *   maxAmount?: number,          // per-transaction limit
 *   allowedCategories?: string[], // whitelist
 *   blockedCategories?: string[], // blacklist
 *   maxDailySpend?: number,
 *   maxMonthlySpend?: number,
 *   timeWindow?: { startHour, endHour, timezone }
 * }
 */

interface PolicyRules {
  maxAmount?: number;
  allowedCategories?: string[];
  blockedCategories?: string[];
  maxDailySpend?: number;
  maxMonthlySpend?: number;
  timeWindow?: {
    startHour: number;
    endHour: number;
    timezone: string;
  };
}

interface AgentWithPolicies {
  policies: Array<{
    policy: {
      action: string;
      rules: unknown;
    };
  }>;
  wallet: {
    perTxLimit: unknown;
    dailyLimit: unknown;
    monthlyBudget: unknown;
  };
}

interface PolicyResult {
  action: "ALLOW" | "BLOCK" | "REQUIRE_APPROVAL";
  reason?: string;
}

export function evaluatePolicies(
  agent: AgentWithPolicies,
  amount: number,
  category?: string,
): PolicyResult {
  // 1. Check wallet-level limits
  const wallet = agent.wallet;

  if (wallet.perTxLimit && amount > Number(wallet.perTxLimit)) {
    return {
      action: "REQUIRE_APPROVAL",
      reason: `Amount $${amount} exceeds per-transaction limit of $${wallet.perTxLimit}`,
    };
  }

  // 2. Evaluate each attached policy
  for (const { policy } of agent.policies) {
    const rules = policy.rules as PolicyRules;
    const action = policy.action as PolicyResult["action"];

    // Max amount check
    if (rules.maxAmount && amount > rules.maxAmount) {
      return {
        action,
        reason: `Amount $${amount} exceeds policy max of $${rules.maxAmount}`,
      };
    }

    // Blocked categories
    if (category && rules.blockedCategories?.includes(category)) {
      return {
        action,
        reason: `Category "${category}" is blocked by policy`,
      };
    }

    // Allowed categories (whitelist)
    if (category && rules.allowedCategories && !rules.allowedCategories.includes(category)) {
      return {
        action,
        reason: `Category "${category}" is not in allowed list`,
      };
    }

    // Time window
    if (rules.timeWindow) {
      const now = new Date();
      const hour = now.getUTCHours(); // simplified — should use timezone
      const { startHour, endHour } = rules.timeWindow;

      if (startHour < endHour) {
        if (hour < startHour || hour >= endHour) {
          return { action, reason: `Transaction outside allowed hours (${startHour}:00-${endHour}:00)` };
        }
      } else {
        // overnight window e.g. 22-06
        if (hour < startHour && hour >= endHour) {
          return { action, reason: `Transaction outside allowed hours (${startHour}:00-${endHour}:00)` };
        }
      }
    }
  }

  return { action: "ALLOW" };
}
