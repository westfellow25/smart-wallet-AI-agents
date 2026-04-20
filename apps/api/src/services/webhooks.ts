import crypto from "crypto";
import { prisma } from "../lib/prisma";

interface WebhookEvent {
  event: string;
  organizationId: string;
  data: Record<string, unknown>;
}

export async function dispatchWebhook(evt: WebhookEvent): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      organizationId: evt.organizationId,
      enabled: true,
      events: { has: evt.event },
    },
  });

  if (webhooks.length === 0) return;

  const payload = JSON.stringify({
    event: evt.event,
    timestamp: new Date().toISOString(),
    data: evt.data,
  });

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      const signature = crypto
        .createHmac("sha256", wh.secret)
        .update(payload)
        .digest("hex");

      try {
        await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AgentVault-Signature": signature,
            "X-AgentVault-Event": evt.event,
          },
          body: payload,
          signal: AbortSignal.timeout(5000),
        });
      } catch (err) {
        console.error(`Webhook ${wh.id} failed:`, err);
      }
    }),
  );
}
