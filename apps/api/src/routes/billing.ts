import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

export const billingRouter = Router();

const PLANS = {
  STARTER: { name: "Starter", price: 199, agents: 5, transactions: 1000 },
  GROWTH: { name: "Growth", price: 599, agents: 25, transactions: 10000 },
  ENTERPRISE: { name: "Enterprise", price: 2000, agents: -1, transactions: -1 },
};

billingRouter.get("/plans", (_req, res) => {
  res.json({ plans: PLANS });
});

billingRouter.use(authenticate);

billingRouter.get("/subscription", async (req: Request, res: Response) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.user!.organizationId },
    select: {
      plan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      stripeCustomerId: true,
    },
  });

  res.json({
    subscription: org,
    planDetails: PLANS[org?.plan || "STARTER"],
  });
});

const checkoutSchema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "ENTERPRISE"]),
});

billingRouter.post("/checkout", async (req: Request, res: Response) => {
  const { plan } = checkoutSchema.parse(req.body);

  if (!process.env.STRIPE_SECRET_KEY) {
    await prisma.organization.update({
      where: { id: req.user!.organizationId },
      data: {
        plan,
        subscriptionStatus: "active",
        trialEndsAt: new Date(Date.now() + 14 * 86400_000),
      },
    });
    return res.json({
      mode: "dev",
      message: "Dev mode: plan updated without Stripe.",
      plan,
    });
  }

  res.json({
    checkoutUrl: "https://stripe.com/checkout/placeholder",
    message: "Connect Stripe keys in .env to enable real billing.",
  });
});

billingRouter.post("/webhook", async (req: Request, res: Response) => {
  console.log("Stripe webhook received:", req.body);
  res.json({ received: true });
});
