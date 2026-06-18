import type { Plan } from "@prisma/client";

export type PlanDef = {
  plan: Plan;
  name: string;
  /** Цена в центах за месяц. */
  priceMonthly: number;
  /** Максимум активных агентов. null = без лимита. */
  maxAgents: number | null;
  /** Месячный объём трат в центах, который покрывает тариф. null = без лимита. */
  monthlyVolume: number | null;
  /** ID цены в Stripe (из env). Пусто для FREE. */
  stripePriceEnv?: string;
  highlights: string[];
};

// Тарифная сетка AgentVault. Под целевой $50K MRR:
// напр. 100 Starter + 40 Growth + 10 Scale ≈ $59.7K MRR.
export const PLANS: Record<Plan, PlanDef> = {
  FREE: {
    plan: "FREE",
    name: "Free",
    priceMonthly: 0,
    maxAgents: 2,
    monthlyVolume: 100_000, // $1,000
    highlights: ["2 агента", "$1k объём/мес", "Policy Engine", "Audit trail"],
  },
  STARTER: {
    plan: "STARTER",
    name: "Starter",
    priceMonthly: 19_900, // $199
    maxAgents: 5,
    monthlyVolume: 1_000_000, // $10k
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    highlights: ["5 агентов", "$10k объём/мес", "Approvals", "Email-алерты"],
  },
  GROWTH: {
    plan: "GROWTH",
    name: "Growth",
    priceMonthly: 49_900, // $499
    maxAgents: 25,
    monthlyVolume: 5_000_000, // $50k
    stripePriceEnv: "STRIPE_PRICE_GROWTH",
    highlights: ["25 агентов", "$50k объём/мес", "Anomaly detection", "Webhooks"],
  },
  SCALE: {
    plan: "SCALE",
    name: "Scale",
    priceMonthly: 200_000, // $2,000
    maxAgents: null,
    monthlyVolume: null,
    stripePriceEnv: "STRIPE_PRICE_SCALE",
    highlights: ["∞ агентов", "Безлимит объём", "SSO / SAML", "Priority support"],
  },
};

export function planLimits(plan: Plan): PlanDef {
  return PLANS[plan];
}

/** Маппинг Stripe Price ID -> наш Plan (по env-переменным). */
export function planForStripePrice(priceId: string): Plan | null {
  for (const def of Object.values(PLANS)) {
    if (def.stripePriceEnv && process.env[def.stripePriceEnv] === priceId) {
      return def.plan;
    }
  }
  return null;
}

export function stripePriceId(plan: Plan): string | null {
  const def = PLANS[plan];
  if (!def.stripePriceEnv) return null;
  return process.env[def.stripePriceEnv] ?? null;
}
