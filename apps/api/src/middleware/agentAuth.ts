import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

// Расширяем Request, чтобы прокинуть аутентифицированного агента в роуты.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      agent?: {
        id: string;
        orgId: string;
        name: string;
      };
    }
  }
}

/**
 * Аутентификация агента по API-ключу.
 * Агент шлёт ключ в заголовке: `Authorization: Bearer av_xxx`.
 * Используется на эндпоинтах, где действует сам агент (создание траты).
 */
export async function agentAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.header("authorization") ?? "";
  const apiKey = header.startsWith("Bearer ") ? header.slice(7) : header;

  if (!apiKey) {
    return res.status(401).json({ error: "Missing API key" });
  }

  const agent = await prisma.agent.findUnique({ where: { apiKey } });
  if (!agent) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  if (agent.status !== "ACTIVE") {
    return res.status(403).json({ error: `Agent is ${agent.status}` });
  }

  req.agent = { id: agent.id, orgId: agent.orgId, name: agent.name };
  next();
}
