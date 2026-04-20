import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { generateApiKey } from "../lib/apiKeys";
import { logAudit } from "../services/audit";

export const apiKeysRouter = Router();
apiKeysRouter.use(authenticate);

apiKeysRouter.get("/", async (req: Request, res: Response) => {
  const keys = await prisma.apiKey.findMany({
    where: { organizationId: req.user!.organizationId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      agentId: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ apiKeys: keys });
});

const createSchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string()).default(["transactions:write"]),
  agentId: z.string().uuid().optional(),
  expiresInDays: z.number().int().positive().optional(),
});

apiKeysRouter.post("/", async (req: Request, res: Response) => {
  const body = createSchema.parse(req.body);
  const { key, prefix, hash } = generateApiKey("live");
  const hashed = await hash;

  const expiresAt = body.expiresInDays
    ? new Date(Date.now() + body.expiresInDays * 86400_000)
    : null;

  const record = await prisma.apiKey.create({
    data: {
      name: body.name,
      scopes: body.scopes,
      agentId: body.agentId,
      keyHash: hashed,
      keyPrefix: prefix,
      expiresAt,
      organizationId: req.user!.organizationId,
    },
  });

  await logAudit({
    action: "api_key.created",
    resourceType: "ApiKey",
    resourceId: record.id,
    organizationId: req.user!.organizationId,
    actorId: req.user!.userId,
    metadata: { name: body.name, scopes: body.scopes },
  });

  res.status(201).json({
    apiKey: { ...record, keyHash: undefined },
    key, // shown once
    warning: "Store this key securely — it won't be shown again.",
  });
});

apiKeysRouter.post("/:id/revoke", async (req: Request, res: Response) => {
  const result = await prisma.apiKey.updateMany({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0) throw new AppError(404, "API key not found or already revoked");

  await logAudit({
    action: "api_key.revoked",
    resourceType: "ApiKey",
    resourceId: req.params.id,
    organizationId: req.user!.organizationId,
    actorId: req.user!.userId,
  });

  res.json({ message: "API key revoked" });
});
