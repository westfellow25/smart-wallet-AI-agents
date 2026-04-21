import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";

export const authRouter = Router();

// ─── Register (creates org + first user) ────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  organizationName: z.string().min(1),
});

authRouter.post("/register", async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    throw new AppError(409, "Email already registered");
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const slug = body.organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const org = await prisma.organization.create({
    data: {
      name: body.organizationName,
      slug,
      users: {
        create: {
          email: body.email,
          passwordHash,
          name: body.name,
          role: "OWNER",
        },
      },
      wallets: {
        create: {
          name: "Master Wallet",
          type: "MASTER",
          balance: 0,
        },
      },
    },
    include: { users: true, wallets: true },
  });

  const user = org.users[0];
  const token = jwt.sign(
    { userId: user.id, organizationId: org.id, role: user.role },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"] },
  );

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    organization: { id: org.id, name: org.name, slug: org.slug },
  });
});

// ─── Login ───────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: { organization: true },
  });

  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = jwt.sign(
    { userId: user.id, organizationId: user.organizationId, role: user.role },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"] },
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    organization: {
      id: user.organization.id,
      name: user.organization.name,
      slug: user.organization.slug,
    },
  });
});

// ─── Me ──────────────────────────────────────────────────────

authRouter.get("/me", authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { organization: true },
  });

  if (!user) throw new AppError(404, "User not found");

  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    organization: {
      id: user.organization.id,
      name: user.organization.name,
      slug: user.organization.slug,
      plan: user.organization.plan,
    },
  });
});
