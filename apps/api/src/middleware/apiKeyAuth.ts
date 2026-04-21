import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { verifyApiKey } from "../lib/apiKeys";
import { AppError } from "./errorHandler";
import { authenticate } from "./auth";

/**
 * Dual-auth middleware: accepts either a JWT (user dashboards) or an API key (agents via SDK).
 *
 * - JWT → sets req.user with { userId, organizationId, role }
 * - API key (av_live_... / av_test_...) → sets req.user with { organizationId, role: "api", agentId? }
 *   Also sets req.apiKeyScopes for scope-based access checks.
 */
declare global {
  namespace Express {
    interface Request {
      apiKeyScopes?: string[];
      apiKeyAgentId?: string;
    }
  }
}

export async function authenticateApiKeyOrJwt(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or invalid authorization header");
  }

  const token = header.slice(7);

  // API key detection: starts with "av_"
  if (token.startsWith("av_")) {
    const prefix = token.slice(0, 14);
    const candidates = await prisma.apiKey.findMany({
      where: {
        keyPrefix: prefix,
        revokedAt: null,
      },
      select: {
        id: true,
        keyHash: true,
        scopes: true,
        agentId: true,
        expiresAt: true,
        organizationId: true,
      },
    });

    for (const candidate of candidates) {
      if (candidate.expiresAt && candidate.expiresAt < new Date()) continue;
      const ok = await verifyApiKey(token, candidate.keyHash);
      if (ok) {
        req.user = {
          userId: candidate.id,
          organizationId: candidate.organizationId,
          role: "api",
        };
        req.apiKeyScopes = candidate.scopes;
        req.apiKeyAgentId = candidate.agentId || undefined;

        // Track last usage (fire-and-forget)
        prisma.apiKey
          .update({
            where: { id: candidate.id },
            data: { lastUsedAt: new Date() },
          })
          .catch(() => {});

        return next();
      }
    }

    throw new AppError(401, "Invalid API key");
  }

  // Fall back to JWT
  return authenticate(req, res, next);
}

export function requireScope(...needed: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role !== "api") return next(); // users bypass scope checks
    const scopes = req.apiKeyScopes || [];
    const missing = needed.filter((s) => !scopes.includes(s));
    if (missing.length) {
      throw new AppError(403, `API key missing scopes: ${missing.join(", ")}`);
    }
    next();
  };
}
