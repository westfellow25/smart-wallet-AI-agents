import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireOrg } from "../middleware/orgContext";
import { detectAnomalies, type AnomalyTx } from "../lib/anomaly";

export const anomaliesRouter = Router();

// GET /v1/anomalies — аномалии по недавним транзакциям организации.
anomaliesRouter.get("/", requireOrg, async (req, res) => {
  const txs = await prisma.transaction.findMany({
    where: { orgId: req.orgId! },
    include: { agent: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const anomalies = detectAnomalies(txs as unknown as AnomalyTx[]);
  res.json(anomalies);
});
