import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

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
 * MVP: организация передаётся заголовком `x-org-id`.
 * TODO (Фаза 2): заменить на JWT-сессию пользователя.
 */
export async function requireOrg(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const orgId = req.header("x-org-id");
  if (!orgId) {
    return res.status(401).json({ error: "Missing x-org-id header" });
  }
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    return res.status(404).json({ error: "Organization not found" });
  }
  req.orgId = orgId;
  next();
}
