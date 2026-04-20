import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

export const auditRouter = Router();
auditRouter.use(authenticate);

auditRouter.get("/", async (req: Request, res: Response) => {
  const { resourceType, resourceId, limit = "50", offset = "0" } = req.query;

  const where: Record<string, unknown> = {
    organizationId: req.user!.organizationId,
  };
  if (resourceType) where.resourceType = resourceType;
  if (resourceId) where.resourceId = resourceId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(limit), 200),
      skip: Number(offset),
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, total });
});
