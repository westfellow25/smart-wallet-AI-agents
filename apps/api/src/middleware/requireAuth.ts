import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth";
import type { Role } from "@prisma/client";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; orgId: string; role: Role };
    }
  }
}

/** Достаёт Bearer-JWT из заголовка Authorization. */
export function bearerToken(req: Request): string | null {
  const header = req.header("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

/**
 * Аутентификация пользователя (человека) по JWT.
 * Ставит req.user и req.orgId.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = { id: payload.userId, orgId: payload.orgId, role: payload.role };
  req.orgId = payload.orgId;
  next();
}
