import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../lib/auth";
import { bearerToken } from "./requireAuth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      orgId?: string;
    }
  }
}

/**
 * Контекст организации для админских эндпоинтов (dashboard).
 * Предпочтительно — JWT пользователя (Authorization: Bearer <jwt>).
 * Fallback на заголовок `x-org-id` оставлен для dev/SDK/тестов.
 */
export async function requireOrg(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 1. Пытаемся достать организацию из JWT.
  const token = bearerToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.orgId = payload.orgId;
    req.user = { id: payload.userId, orgId: payload.orgId, role: payload.role };
    return next();
  }

  // 2. Fallback: заголовок x-org-id (dev / SDK).
  const orgId = req.header("x-org-id");
  if (!orgId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    return res.status(404).json({ error: "Organization not found" });
  }
  req.orgId = orgId;
  next();
}
