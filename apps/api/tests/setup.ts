process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://agentvault:agentvault@localhost:5432/agentvault_test?schema=public";
