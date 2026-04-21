import { evaluatePolicies } from "./policyEngine";

function makeAgent(policies: Array<{ action: string; rules: unknown }> = [], wallet: Partial<{ perTxLimit: number; dailyLimit: number; monthlyBudget: number }> = {}) {
  return {
    policies: policies.map((p) => ({ policy: p })),
    wallet: {
      perTxLimit: wallet.perTxLimit ?? null,
      dailyLimit: wallet.dailyLimit ?? null,
      monthlyBudget: wallet.monthlyBudget ?? null,
    },
  };
}

describe("policyEngine.evaluatePolicies", () => {
  describe("wallet-level limits", () => {
    it("allows transaction under per-tx limit", () => {
      const result = evaluatePolicies(makeAgent([], { perTxLimit: 100 }), 50);
      expect(result.action).toBe("ALLOW");
    });

    it("requires approval when amount exceeds per-tx limit", () => {
      const result = evaluatePolicies(makeAgent([], { perTxLimit: 100 }), 150);
      expect(result.action).toBe("REQUIRE_APPROVAL");
      expect(result.reason).toContain("per-transaction limit");
    });
  });

  describe("maxAmount rule", () => {
    it("blocks when amount exceeds policy maxAmount", () => {
      const result = evaluatePolicies(
        makeAgent([{ action: "BLOCK", rules: { maxAmount: 50 } }]),
        100,
      );
      expect(result.action).toBe("BLOCK");
      expect(result.reason).toContain("exceeds policy max");
    });

    it("uses the policy's configured action (REQUIRE_APPROVAL)", () => {
      const result = evaluatePolicies(
        makeAgent([{ action: "REQUIRE_APPROVAL", rules: { maxAmount: 50 } }]),
        100,
      );
      expect(result.action).toBe("REQUIRE_APPROVAL");
    });

    it("allows when amount is exactly at the limit", () => {
      const result = evaluatePolicies(
        makeAgent([{ action: "BLOCK", rules: { maxAmount: 50 } }]),
        50,
      );
      expect(result.action).toBe("ALLOW");
    });
  });

  describe("category rules", () => {
    it("blocks a transaction in a blocked category", () => {
      const result = evaluatePolicies(
        makeAgent([{ action: "BLOCK", rules: { blockedCategories: ["gambling"] } }]),
        10,
        "gambling",
      );
      expect(result.action).toBe("BLOCK");
      expect(result.reason).toContain("blocked by policy");
    });

    it("blocks when category is not in allowed list", () => {
      const result = evaluatePolicies(
        makeAgent([{ action: "BLOCK", rules: { allowedCategories: ["api-call"] } }]),
        10,
        "gambling",
      );
      expect(result.action).toBe("BLOCK");
      expect(result.reason).toContain("not in allowed list");
    });

    it("allows a transaction in an allowed category", () => {
      const result = evaluatePolicies(
        makeAgent([{ action: "BLOCK", rules: { allowedCategories: ["api-call"] } }]),
        10,
        "api-call",
      );
      expect(result.action).toBe("ALLOW");
    });

    it("ignores category rules when no category is provided", () => {
      const result = evaluatePolicies(
        makeAgent([{ action: "BLOCK", rules: { blockedCategories: ["gambling"] } }]),
        10,
      );
      expect(result.action).toBe("ALLOW");
    });
  });

  describe("time window rules", () => {
    it("applies a daytime window correctly", () => {
      // Time window: 9-17, assume test is run at any UTC hour outside
      const currentHour = new Date().getUTCHours();
      const windowStart = (currentHour + 1) % 24;
      const windowEnd = (currentHour + 2) % 24;

      // Ensure window is a forward range
      if (windowEnd <= windowStart) return; // skip edge case

      const result = evaluatePolicies(
        makeAgent([
          {
            action: "BLOCK",
            rules: { timeWindow: { startHour: windowStart, endHour: windowEnd, timezone: "UTC" } },
          },
        ]),
        10,
      );
      expect(result.action).toBe("BLOCK");
      expect(result.reason).toContain("outside allowed hours");
    });

    it("allows when current time is within the window", () => {
      const currentHour = new Date().getUTCHours();
      const start = currentHour;
      const end = (currentHour + 2) % 24;
      if (end <= start) return; // skip overnight edge

      const result = evaluatePolicies(
        makeAgent([
          {
            action: "BLOCK",
            rules: { timeWindow: { startHour: start, endHour: end, timezone: "UTC" } },
          },
        ]),
        10,
      );
      expect(result.action).toBe("ALLOW");
    });
  });

  describe("multiple policies", () => {
    it("returns first matching policy violation", () => {
      const result = evaluatePolicies(
        makeAgent([
          { action: "BLOCK", rules: { maxAmount: 100 } },
          { action: "REQUIRE_APPROVAL", rules: { maxAmount: 50 } },
        ]),
        75,
      );
      // First policy doesn't match (75 < 100), second does
      expect(result.action).toBe("REQUIRE_APPROVAL");
    });

    it("allows when no policy triggers", () => {
      const result = evaluatePolicies(
        makeAgent([
          { action: "BLOCK", rules: { maxAmount: 1000 } },
          { action: "BLOCK", rules: { blockedCategories: ["gambling"] } },
        ]),
        10,
        "api-call",
      );
      expect(result.action).toBe("ALLOW");
    });
  });

  describe("no policies", () => {
    it("allows any amount when no policies are attached and no wallet limits", () => {
      const result = evaluatePolicies(makeAgent(), 999999);
      expect(result.action).toBe("ALLOW");
    });
  });
});
