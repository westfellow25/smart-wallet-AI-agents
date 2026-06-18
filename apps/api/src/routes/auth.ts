import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, signToken } from "../lib/auth";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Пароль минимум 8 символов"),
  name: z.string().optional(),
  orgName: z.string().optional(),
});

// POST /v1/auth/signup — создаёт организацию + владельца, возвращает JWT.
authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password, name, orgName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email уже зарегистрирован" });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "OWNER",
      org: {
        create: {
          name: orgName || (name ? `${name}'s org` : "My org"),
          // новой организации сразу даём FREE-подписку
          subscription: { create: { plan: "FREE" } },
        },
      },
    },
  });

  const token = signToken({ userId: user.id, orgId: user.orgId, role: user.role });
  res.status(201).json({ token, user: publicUser(user) });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /v1/auth/login — вход по email+паролю, возвращает JWT.
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Неверный email или пароль" });
  }

  const token = signToken({ userId: user.id, orgId: user.orgId, role: user.role });
  res.json({ token, user: publicUser(user) });
});

// GET /v1/auth/me — текущий пользователь + организация.
authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { org: { select: { id: true, name: true } } },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: { ...publicUser(user), org: user.org } });
});

function publicUser(u: { id: string; email: string; name: string | null; role: string; orgId: string }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, orgId: u.orgId };
}
