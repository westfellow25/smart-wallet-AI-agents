import { Router, Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

export const webhooksRouter = Router();
webhooksRouter.use(authenticate);

const AVAILABLE_EVENTS = [
  "transaction.created",
  "transaction.completed",
  "transaction.blocked",
  "approval.required",
  "approval.approved",
  "approval.rejected",
  "wallet.low_balance",
  "policy.triggered",
];

webhooksRouter.get("/events", (_req, res) => {
  res.json({ events: AVAILABLE_EVENTS });
});

webhooksRouter.get("/", async (req: Request, res: Response) => {
  const webhooks = await prisma.webhook.findMany({
    where: { organizationId: req.user!.organizationId },
    select: {
      id: true,
      url: true,
      events: true,
      enabled: true,
      createdAt: true,
    },
  });
  res.json({ webhooks });
});

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

webhooksRouter.post("/", async (req: Request, res: Response) => {
  const body = createSchema.parse(req.body);

  const invalid = body.events.filter((e) => !AVAILABLE_EVENTS.includes(e));
  if (invalid.length) {
    throw new AppError(400, `Unknown events: ${invalid.join(", ")}`);
  }

  const secret = `whsec_${crypto.randomBytes(24).toString("base64url")}`;

  const webhook = await prisma.webhook.create({
    data: {
      url: body.url,
      events: body.events,
      secret,
      organizationId: req.user!.organizationId,
    },
  });

  res.status(201).json({ webhook });
});

webhooksRouter.patch("/:id", async (req: Request, res: Response) => {
  const body = z.object({ enabled: z.boolean() }).parse(req.body);

  const result = await prisma.webhook.updateMany({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId,
    },
    data: { enabled: body.enabled },
  });

  if (result.count === 0) throw new AppError(404, "Webhook not found");
  res.json({ message: "Updated" });
});

webhooksRouter.delete("/:id", async (req: Request, res: Response) => {
  const result = await prisma.webhook.deleteMany({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId,
    },
  });

  if (result.count === 0) throw new AppError(404, "Webhook not found");
  res.json({ message: "Deleted" });
});
