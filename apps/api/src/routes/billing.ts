import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import type { Plan } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireOrg } from "../middleware/orgContext";
import { PLANS, planLimits, planForStripePrice, stripePriceId } from "../lib/plans";
import { isStripeEnabled, stripe } from "../lib/stripe";

export const billingRouter = Router();

/** Текущая подписка организации (создаёт FREE, если ещё нет). */
async function getSubscription(orgId: string) {
  const existing = await prisma.subscription.findUnique({ where: { orgId } });
  if (existing) return existing;
  return prisma.subscription.create({ data: { orgId, plan: "FREE" } });
}

// GET /v1/billing/plans — публичная витрина тарифов.
billingRouter.get("/plans", (_req, res) => {
  res.json(Object.values(PLANS));
});

// GET /v1/billing/subscription — текущая подписка + лимиты + использование.
billingRouter.get("/subscription", requireOrg, async (req, res) => {
  const sub = await getSubscription(req.orgId!);
  const limits = planLimits(sub.plan);
  const agentCount = await prisma.agent.count({
    where: { orgId: req.orgId!, status: { not: "REVOKED" } },
  });
  res.json({
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    limits,
    usage: {
      agents: agentCount,
      agentsLimit: limits.maxAgents,
    },
    stripeEnabled: isStripeEnabled(),
  });
});

const checkoutSchema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "SCALE"]),
});

// POST /v1/billing/checkout — апгрейд тарифа.
// Со Stripe -> возвращает checkout URL. Без ключа (dev) -> применяет тариф сразу.
billingRouter.post("/checkout", requireOrg, async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const plan = parsed.data.plan as Plan;
  const sub = await getSubscription(req.orgId!);

  // Dev-режим: применяем тариф напрямую, без оплаты.
  if (!isStripeEnabled()) {
    const updated = await prisma.subscription.update({
      where: { orgId: req.orgId! },
      data: { plan, status: "ACTIVE" },
    });
    return res.json({ devMode: true, plan: updated.plan, status: updated.status });
  }

  const priceId = stripePriceId(plan);
  if (!priceId) {
    return res.status(500).json({ error: `No Stripe price configured for ${plan}` });
  }

  // Создаём/переиспользуем Stripe customer.
  let customerId = sub.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe().customers.create({
      metadata: { orgId: req.orgId! },
    });
    customerId = customer.id;
    await prisma.subscription.update({
      where: { orgId: req.orgId! },
      data: { stripeCustomerId: customerId },
    });
  }

  const baseUrl = process.env.DASHBOARD_URL ?? "http://localhost:3000";
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/billing?success=1`,
    cancel_url: `${baseUrl}/billing?canceled=1`,
    metadata: { orgId: req.orgId!, plan },
  });

  res.json({ url: session.url });
});

/**
 * POST /v1/billing/webhook — приёмник событий Stripe.
 * Монтируется в index.ts с express.raw (нужно сырое тело для подписи).
 */
export async function stripeWebhookHandler(req: Request, res: Response) {
  if (!isStripeEnabled()) {
    return res.status(400).json({ error: "Stripe is not enabled" });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.header("stripe-signature");

  let event;
  try {
    if (!secret || !sig) throw new Error("Missing webhook secret/signature");
    event = stripe().webhooks.constructEvent(req.body, sig, secret);
  } catch (e) {
    return res.status(400).json({ error: `Webhook signature failed: ${(e as Error).message}` });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as any;
        const orgId = s.metadata?.orgId;
        const plan = s.metadata?.plan as Plan | undefined;
        if (orgId && plan) {
          await prisma.subscription.update({
            where: { orgId },
            data: {
              plan,
              status: "ACTIVE",
              stripeCustomerId: s.customer ?? undefined,
              stripeSubscriptionId: s.subscription ?? undefined,
            },
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const s = event.data.object as any;
        const priceId = s.items?.data?.[0]?.price?.id;
        const plan = priceId ? planForStripePrice(priceId) : null;
        const canceled = event.type === "customer.subscription.deleted" || s.status === "canceled";
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: s.id },
          data: {
            ...(plan && !canceled ? { plan } : {}),
            ...(canceled ? { plan: "FREE", status: "CANCELED" } : { status: "ACTIVE" }),
            currentPeriodEnd: s.current_period_end
              ? new Date(s.current_period_end * 1000)
              : undefined,
          },
        });
        break;
      }
    }
  } catch (e) {
    console.error("Webhook handling error:", e);
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  res.json({ received: true });
}
