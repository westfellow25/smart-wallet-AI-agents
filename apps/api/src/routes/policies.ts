import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireOrg } from "../middleware/orgContext";

export const policiesRouter = Router();

const createPolicySchema = z.object({
  name: z.string().min(1),
  maxPerTransaction: z.number().int().positive().nullish(),
  dailyLimit: z.number().int().positive().nullish(),
  requireApprovalOver: z.number().int().positive().nullish(),
  allowedCategories: z.array(z.string()).default([]),
});

// POST /v1/policies — создать политику трат.
policiesRouter.post("/", requireOrg, async (req, res) => {
  const parsed = createPolicySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const policy = await prisma.policy.create({
    data: { orgId: req.orgId!, ...parsed.data },
  });
  res.status(201).json(policy);
});

// GET /v1/policies — список политик организации.
policiesRouter.get("/", requireOrg, async (req, res) => {
  const policies = await prisma.policy.findMany({
    where: { orgId: req.orgId! },
    orderBy: { createdAt: "desc" },
  });
  res.json(policies);
});
