import { prisma } from "../lib/prisma";

interface LogParams {
  action: string;
  resourceType: string;
  resourceId: string;
  organizationId: string;
  actorId?: string;
  actorType?: "user" | "system" | "api";
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: LogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        organizationId: params.organizationId,
        actorId: params.actorId,
        actorType: params.actorType || "user",
        metadata: params.metadata as never,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
