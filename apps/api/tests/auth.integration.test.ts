/**
 * Integration test for auth flow. Uses a mocked Prisma client to avoid needing a real DB.
 * For true end-to-end DB tests, configure DATABASE_URL to a test instance and remove the mock.
 */

import request from "supertest";

jest.mock("../src/lib/prisma", () => {
  const mockUser = {
    findUnique: jest.fn(),
  };
  const mockOrg = {
    create: jest.fn(),
  };
  return {
    prisma: {
      user: mockUser,
      organization: mockOrg,
    },
  };
});

import { prisma } from "../src/lib/prisma";
import app from "../src/app";
import bcrypt from "bcryptjs";

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  organization: { create: jest.Mock };
};

describe("POST /api/v1/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects invalid email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "not-an-email", password: "password123", name: "Alex", organizationName: "Acme" });
    expect(res.status).toBe(400);
  });

  it("rejects short password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "alex@acme.ai", password: "short", name: "Alex", organizationName: "Acme" });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate email", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ id: "existing", email: "alex@acme.ai" });

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "alex@acme.ai", password: "password123", name: "Alex", organizationName: "Acme" });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("already registered");
  });

  it("creates org + user and returns token on success", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.organization.create.mockResolvedValue({
      id: "org-1",
      name: "Acme",
      slug: "acme",
      users: [{ id: "u-1", email: "alex@acme.ai", name: "Alex", role: "OWNER" }],
      wallets: [{ id: "w-1" }],
    });

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "alex@acme.ai", password: "password123", name: "Alex", organizationName: "Acme" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("alex@acme.ai");
    expect(res.body.organization.slug).toBe("acme");
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects wrong password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 12);
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "u-1",
      email: "alex@acme.ai",
      name: "Alex",
      role: "MEMBER",
      passwordHash,
      organizationId: "org-1",
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "alex@acme.ai", password: "wrong-password" });

    expect(res.status).toBe(401);
  });

  it("returns token on valid credentials", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 12);
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "u-1",
      email: "alex@acme.ai",
      name: "Alex",
      role: "MEMBER",
      passwordHash,
      organizationId: "org-1",
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "alex@acme.ai", password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("alex@acme.ai");
  });

  it("rejects unknown email", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@acme.ai", password: "whatever" });

    expect(res.status).toBe(401);
  });
});

describe("GET /health", () => {
  it("returns 200 OK", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
